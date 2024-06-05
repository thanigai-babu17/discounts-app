import { Box, Card, Layout, Page, EmptyState, Banner } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { authenticate } from '~/shopify.server';
import { LoaderFunctionArgs } from '@remix-run/node';
import db from '../db.server';
import { useState } from 'react';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const querySnapshot = await db
    .collection(`product_sync`)
    .where('shop', '==', session.shop)
    .limit(1)
    .get();
  const querySnapshotData = querySnapshot.docs.map((q) => {
    const qData = q.data();
    return {
      id: q.id,
      shop: qData.shop,
      status: qData.status,
      operation_id: qData.operation_id,
    };
  });
  return {
    data: querySnapshotData[0] || null,
  };
};

export default function DiscountgroupsPage() {
  const loaderData = useLoaderData<typeof loader>();
  return (
    <Page fullWidth>
      <Layout>
        <Layout.Section>
          <Card>
            {loaderData.data?.status === 'CREATED' && (
              <Banner title="Products Sync Inprogress" tone="info">
                <p>syncing in progress it may take a while please come back later</p>
              </Banner>
            )}
            {loaderData.data === null && (
              <Banner title="Products Not Synced!" tone="warning">
                <p>
                  Please to products sync section in <Link to={'/app'}>here</Link> to start syncing
                  product to discounts app.
                </p>
              </Banner>
            )}
            <EmptyState
              heading="Manage your discount groups"
              action={{
                content: 'Add Discount group',
                url: '/app/discount-groups/create',
                disabled: loaderData.data?.status != 'COMPLETE',
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>
                Efficiently oversee discount groups with streamlined organization and optimization
                for enhanced savings and customer satisfaction.
              </p>
            </EmptyState>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

import { Box, Card, Layout, Page, EmptyState, Banner, BlockStack } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { authenticate } from '~/shopify.server';
import { LoaderFunctionArgs } from '@remix-run/node';
import db from '../db/db.server';
import { useState } from 'react';
import DiscountGroupIndexTable from '~/components/DiscountGroupIndexTable';
import { DiscountGroup } from '~/common/types';
import { tableNamePrefix } from '~/common/utils';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [productSyncResp] = await db('product_sync')
    .select('status')
    .where('shop', session.shop)
    .limit(1);

  const discountGroup = await db(tableNamePrefix(`${session.shop}_discountgroups`))
    .select(
      'id',
      'status',
      'handle',
      'sub_discount_type',
      'sub_discount_value',
      'onetime_discount_type',
      'onetime_discount_value',
      'criterias'
    )
    .orderBy('updated_at', 'desc');

  return {
    data: {
      sync_status: productSyncResp ? productSyncResp?.status : null,
      discount_groups: discountGroup || null,
    },
  };
};

export default function DiscountgroupsPage() {
  const loaderData = useLoaderData<typeof loader>();
  return (
    <Page
      title="Discount Groups"
      fullWidth={true}
      compactTitle={true}
      primaryAction={{
        content: 'New Discount Group',
        disabled: loaderData.data?.sync_status != 'COMPLETE',
        url: '/app/discount-groups/create',
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap={'400'}>
            {loaderData.data?.sync_status === 'CREATED' && (
              <Banner title="Products Sync Inprogress" tone="info">
                <p>syncing in progress it may take a while please come back later</p>
              </Banner>
            )}
            {loaderData.data?.sync_status === null && (
              <Banner title="Products Not Synced!" tone="warning">
                <p>
                  Please to products sync section in <Link to={'/app'}>here</Link> to start syncing
                  product to discounts app.
                </p>
              </Banner>
            )}
            {loaderData.data?.discount_groups && loaderData.data?.discount_groups.length ? (
              <DiscountGroupIndexTable
                discounts={loaderData.data?.discount_groups as DiscountGroup[]}
              />
            ) : (
              <Card>
                <EmptyState
                  heading="Manage your discount groups"
                  action={{
                    content: 'Add Discount group',
                    url: '/app/discount-groups/create',
                    disabled: loaderData.data?.sync_status != 'COMPLETE',
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Efficiently oversee discount groups with streamlined organization and
                    optimization for enhanced savings and customer satisfaction.
                  </p>
                </EmptyState>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

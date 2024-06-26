import { useEffect, useState } from 'react';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
  useSubmit,
} from '@remix-run/react';
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  TextField,
  InlineGrid,
  Divider,
  useBreakpoints,
  Banner,
  Badge,
} from '@shopify/polaris';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';
import db from '../db.server';

type ResponseFetcherType = {
  status: boolean;
  message: string;
  stack: any;
  data: any;
};

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
    shop: session.shop,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const syncAction = formData.get('action');
  if (syncAction === 'PRODUCT_SYNC') {
    const response = await admin.graphql(`#graphql
      mutation{
        bulkOperationRunQuery(
          query:"""
            {
              productVariants {
                edges {
                  node {
                    id
                    displayName
                    title
                    price
                    compareAtPrice
                    availableForSale
                    sku
                    image {
                      url
                    }
                    product {
                      id
                      title
                      productType
                      tags
                      status
                      featuredImage {
                        id
                        url
                      }
                      collections(first:250){
                        edges {
                          node {
                            id
                            title
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          """
        ){
          bulkOperation {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
   `);
    const responseJson = await response.json();
    if (
      responseJson.data.bulkOperationRunQuery.bulkOperation &&
      !responseJson.data.bulkOperationRunQuery.userErrors.length
    ) {
      const docRef = await db.collection(`product_sync`).add({
        shop: session.shop,
        status: responseJson.data.bulkOperationRunQuery.bulkOperation.status,
        operation_id: responseJson.data.bulkOperationRunQuery.bulkOperation.id,
      });
      const docData = (await docRef.get()).data();
      return {
        status: true,
        message: 'Bulk query request initiated successfully',
        data: {
          id: docRef.id,
          shop: docData?.shop,
          status: docData?.status,
          operation_id: docData?.operation_id,
        },
      };
    } else {
      return {
        status: false,
        message: 'Something wend wrong, Please try again.',
        stack: responseJson.data.bulkOperationRunQuery.userErrors,
      };
    }
  }

  if (syncAction === 'PRODUCT_RESYNC') {
    return {
      status: true,
      message: 'Bulk query request initiated successfully',
      data: {
        id: 'asdasd',
        shop: 'asdasdas',
        status: 'CREATED',
      },
    };
  }

  if (syncAction === 'STATUS_REFRESH') {
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
      status: true,
      message: 'Bulk query request initiated successfully',
      data: querySnapshotData[0] || null,
    };
  }
};

export default function Index() {
  const nav = useNavigation();
  const fetcher = useFetcher<ResponseFetcherType | undefined>();
  const loaderData = useLoaderData<typeof loader>();
  const [productSyncStatus, setProductSyncStatus] = useState<string | null>(
    loaderData.data?.status || null
  );

  useEffect(() => {
    console.log(fetcher.data, 'fetched data');
    if (fetcher.data) {
      if (fetcher.data.data.status) {
        setProductSyncStatus(fetcher.data.data.status);
      }
    }
  }, [fetcher.data]);

  const handleSyncProduct = () => {
    fetcher.submit({ action: 'PRODUCT_SYNC' }, { method: 'POST' });
  };

  const handleRefreshSyncStatus = () => {
    fetcher.submit({ action: 'STATUS_REFRESH' }, { method: 'POST' });
  };

  const handleReSyncProduct = () => {
    fetcher.submit({ action: 'PRODUCT_RESYNC' }, { method: 'POST' });
  };

  console.log(productSyncStatus, 'product sync status');

  return (
    <Page>
      <BlockStack gap={{ xs: '800', sm: '400' }}>
        <InlineGrid columns={{ xs: '1fr', md: '2fr 5fr' }} gap="400">
          <Box as="section">
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Product Sync
              </Text>
              <Text as="p" variant="bodyMd">
                Product bulk query when bulk query is done downloads the file and syncs with
                firestore db
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap="400">
              {productSyncStatus ? (
                <BlockStack gap={'400'}>
                  {productSyncStatus === 'COMPLETE' && (
                    <SyncCompleted
                      callbackHandler={handleReSyncProduct}
                      loading={fetcher.state != 'idle'}
                    />
                  )}
                  {productSyncStatus === 'CREATED' && (
                    <SyncInProgress
                      callbackHandler={handleRefreshSyncStatus}
                      loading={fetcher.state != 'idle'}
                    />
                  )}
                </BlockStack>
              ) : (
                <BlockStack gap={'400'}>
                  <Banner title="Products not Synced">
                    <p>
                      sync products by clicking on "Sync Products" which will bulk fetch all
                      products from store extract all the variants and pushes it to discount app
                      database.
                    </p>
                  </Banner>
                  <Button
                    variant="primary"
                    onClick={handleSyncProduct}
                    loading={fetcher.state != 'idle'}
                  >
                    Sync Products
                  </Button>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </InlineGrid>
        {/* {smUp ? <Divider /> : null} */}
      </BlockStack>
    </Page>
  );
}

const SyncInProgress = ({ callbackHandler, loading }: any) => {
  return (
    <>
      <Banner title="Products Sync Inprogress" tone="info">
        <p>syncing in progress it may take a while click on refresh the status</p>
      </Banner>
      <InlineStack gap={'300'}>
        <Badge
          tone="attention"
          progress="incomplete"
          toneAndProgressLabelOverride="Syncing in progress"
        >
          In Progress
        </Badge>
        <Button variant="primary" onClick={() => callbackHandler()} loading={loading}>
          Refresh
        </Button>
      </InlineStack>
    </>
  );
};

const SyncCompleted = ({ callbackHandler, loading }: any) => {
  return (
    <>
      <Banner title="Products Synced Completed" tone="success">
        <p>
          If you want to re sync products click on "Re-sync Products" (Note: Re-sync will remove all
          the products and uploads a freshcopy)
        </p>
      </Banner>
      <InlineStack gap={'300'}>
        <Badge
          tone="success"
          progress="complete"
          toneAndProgressLabelOverride="Syncing in complete"
        >
          Completed
        </Badge>
        <Button variant="primary" onClick={() => callbackHandler()} loading={loading}>
          Re-sync Products
        </Button>
      </InlineStack>
    </>
  );
};

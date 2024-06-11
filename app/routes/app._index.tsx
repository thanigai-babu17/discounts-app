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
import db from '../db/db.server';

type ResponseFetcherType = {
  status: boolean;
  message: string;
  stack: any;
  data: any;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [queryResp] = await db('product_sync')
    .select('id', 'shop', 'status', 'operation_id')
    .where('shop', session.shop)
    .limit(1);
  console.log(queryResp, 'query result');
  let queryData = null;
  if (queryResp) {
    queryData = queryResp;
  }
  return {
    data: queryResp,
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
                    metafields(first:10,namespace:"a360_discounts"){
                      edges {
                        node {
                            id
                            key
                            value
                            namespace
                            type
                        }
                      }
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
    console.log(JSON.stringify(responseJson), 'query response json');
    if (
      responseJson.data.bulkOperationRunQuery.bulkOperation &&
      !responseJson.data.bulkOperationRunQuery.userErrors.length
    ) {
      const recRef = await db(`product_sync`)
        .returning(['id', 'shop', 'status', 'operation_id'])
        .insert({
          shop: session.shop,
          status: responseJson.data.bulkOperationRunQuery.bulkOperation.status,
          operation_id: responseJson.data.bulkOperationRunQuery.bulkOperation.id,
        });
      return {
        status: true,
        message: 'Bulk query request initiated successfully',
        data: recRef,
      };
    } else {
      return {
        status: false,
        message: 'Something went wrong, Please try again.',
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
    const [queryResult] = await db('product_sync')
      .select('id', 'shop', 'status', 'operation_id')
      .where('shop', session.shop)
      .limit(1);
    console.log(queryResult, 'query result');
    if (queryResult) {
      return {
        status: true,
        message: 'Bulk query request initiated successfully',
      };
    } else {
      return {
        status: false,
        message: 'No matching record found',
      };
    }
  }
};

export default function Index() {
  const fetcher = useFetcher<ResponseFetcherType | undefined>();
  const loaderData = useLoaderData<typeof loader>();
  const [productSyncStatus, setProductSyncStatus] = useState<string | null>(
    loaderData.data?.status || null
  );

  useEffect(() => {
    
    shopify.toast.show(fetcher.data?.message as string, {
      isError: !fetcher.data?.status,
    });
    console.log(console.log(fetcher.data, 'fetched data'));
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

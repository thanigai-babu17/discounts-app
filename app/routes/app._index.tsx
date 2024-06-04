import { useEffect } from 'react';
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
} from '@shopify/polaris';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';
import db from '../db.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const querySnapshot = await db
    .collection(`product_sync`)
    .where('shop', '==', session.shop)
    .limit(1)
    .get();
  const querySnapshotData = querySnapshot.docs.map((q) => {
    return { id: q.id, data: q.data() };
  });
  return {
    data: querySnapshotData[0] || null,
    shop: session.shop,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
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
    const docData = await docRef.get();
    return {
      status: true,
      message: 'Bulk query request initiated successfully',
      data: { id: docRef.id, data: docData.data() },
    };
  } else {
    return {
      status: false,
      message: 'Something wend wrong, Please try again.',
      stack: responseJson.data.bulkOperationRunQuery.userErrors,
    };
  }
};

type ResponseFetcherType = {
  status: boolean;
  message: string;
  stack: any;
  data: any;
};

export default function Index() {
  const nav = useNavigation();
  const fetcher = useFetcher<ResponseFetcherType | undefined>();
  const loaderData = useLoaderData<typeof loader>();
  console.log(loaderData, 'loader data');
  const actionData = useActionData<typeof action>();

  useEffect(() => {
    console.log(fetcher.data, 'fetched data');
    if (fetcher.data) {
      shopify.toast.show(fetcher.data.message, {
        isError: !fetcher.data.status,
      });
    }
  }, [fetcher.data]);

  const generateProduct = () => {
    fetcher.submit({}, { method: 'POST' });
  };

  return (
    <Page>
      <BlockStack gap="500">
        <Layout>
          <Card>
            <BlockStack gap={'500'}>
              <Text as="h2" variant="headingMd">
                Sync products from shop to app
              </Text>
              <Button variant="primary" onClick={generateProduct} loading={fetcher.state != 'idle'}>
                Run Bulk Query
              </Button>
            </BlockStack>
          </Card>
        </Layout>
      </BlockStack>
    </Page>
  );
}

import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import db from '../db/db.server';
import { productBulkQueryHandler } from '~/handlers';
import { tableNamePrefix } from '~/common/utils';

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);
  console.log('inside webhook callback');
  if (!admin) {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    throw new Response();
  }

  switch (topic) {
    case 'APP_UNINSTALLED':
      if (session) {
        await db('shopify_sessions').where('shop', shop).del();
        await db('product_sync').where('shop', shop).del();
        Promise.all([
          db.schema.dropTableIfExists(tableNamePrefix(`${shop}_products`)),
          db.schema.dropTableIfExists(tableNamePrefix(`${shop}_discountgroups`)),
          db('product_sync').where('shop', shop).del(),
        ])
          .then((resp: any) => {
            console.log('APP_UNINSTALLED:', resp);
          })
          .catch((err) => {
            console.log('APP_UNINSTALLED:Error while deleting tables');
            throw err;
          });
      }
      break;
    case 'BULK_OPERATIONS_FINISH':
      console.log('inside bulk query', topic);
      const bulkQueryfileUrlResp = await admin
        .graphql(
          `#graphql
            query {
              node(id: "${payload.admin_graphql_api_id}") {
                ... on BulkOperation {
                  id
                  url
                }
              }
            }`
        )
        .then(async (resp) => await resp.json());
      console.log('bulk query finished', bulkQueryfileUrlResp.data.node.url);
      productBulkQueryHandler(bulkQueryfileUrlResp.data.node.url, shop)
        .then(() => {
          console.info('bulk query handler completed');
        })
        .catch((err) => {
          console.error('bulk query handler completed');
        });
      break;
    case 'CUSTOMERS_DATA_REQUEST':
    case 'CUSTOMERS_REDACT':
    case 'SHOP_REDACT':
    default:
      throw new Response('Unhandled webhook topic', { status: 404 });
  }
  console.log('end of webhook callback');
  throw new Response();
};

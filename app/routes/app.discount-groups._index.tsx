import { Box, Card, Layout, Page, EmptyState } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { Outlet } from '@remix-run/react';

export default function DiscountgroupsPage() {
   function handleCreateNewDiscountgroup() {
      console.log('new dioscount group');
   }

   return (
      <Page fullWidth>
         <Layout>
            <Layout.Section>
               <Card>
                  <EmptyState
                     heading="Manage your discount groups"
                     action={{
                        content: 'Add Discount group',
                        url: '/app/discount-groups/create',
                     }}
                     image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                     <p>
                        Efficiently oversee discount groups with streamlined
                        organization and optimization for enhanced savings and
                        customer satisfaction.
                     </p>
                  </EmptyState>
               </Card>
            </Layout.Section>
         </Layout>
      </Page>
   );
}

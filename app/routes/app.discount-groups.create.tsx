//@ts-nocheck
import {
   Box,
   Card,
   Layout,
   Page,
   EmptyState,
   Select,
   Form,
   FormLayout,
   TextField,
   Button,
   InlineStack,
   InlineGrid,
   BlockStack,
   Text,
   IndexTable,
   LegacyCard,
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { useCallback, useState } from 'react';
import { FieldArray, insert, useFormik } from 'formik';
import { MinusIcon } from '@shopify/polaris-icons';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import { json } from 'stream/consumers';
import { useLoaderData } from '@remix-run/react';

type ConditionRow = {
   property_name: string;
   operator: string;
   property_value: string;
};

const propertyNameOptions = [
   { label: 'Collection', value: 'collection' },
   { label: 'Product Type', value: 'product_type' },
   { label: 'Product Tag', value: 'tags' },
   { label: 'Variant Name', value: 'variant_title' },
   { label: 'price', value: 'price' },
];

const propertyOperatorsMap = {
   collection: [
      { label: 'is equal to', value: '==' },
      { label: 'not equal to', value: '!=' },
      { label: 'starts with', value: '>=' },
      { label: 'ends with', value: '<' },
   ],
   product_type: [
      { label: 'is equal to', value: '==' },
      { label: 'not equal to', value: '!=' },
      { label: 'starts with', value: '>=' },
      { label: 'ends with', value: '<' },
   ],
   tags: [{ label: 'array-contains', value: '<' }],
   price: [
      { label: 'is equal to', value: '==' },
      { label: 'not equal to', value: '!=' },
      { label: 'greater than', value: '>' },
      { label: 'greater than or equal to', value: '>=' },
      { label: 'less than', value: '<' },
      { label: 'less than or equal to', value: '<=' },
   ],
   variant_title: [
      { label: 'is equal to', value: '==' },
      { label: 'not equal to', value: '!=' },
      { label: 'starts with', value: '>=' },
      { label: 'ends with', value: '<' },
   ],
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
   const { admin } = await authenticate.admin(request);
   const response = await admin.graphql(
      `#graphql
            query {
                products(first: 250){
                    nodes{
                        id
                        title
                        featuredImage{
                            id
                            url
                        }                        
                    }
                }
            }
        `
   );
   const responseJson = await response.json();
   return {
      products: responseJson.data,
   };
};

export default function DiscountgroupsPageCreate() {
   const loaderData = useLoaderData<typeof loader>();
   console.log(loaderData, 'loader data');
   function handleCreateNewDiscountgroup() {
      console.log('new dioscount group');
   }

   const [selected, setSelected] = useState('today');
   const discountGroupForm = useFormik({
      initialValues: {
         handle: '',
         conditionSet: [
            {
               property_name: propertyNameOptions[0].value,
               operator:
                  propertyOperatorsMap[
                     propertyNameOptions[0]
                        .value as keyof typeof propertyOperatorsMap
                  ][0].value,
               property_value: '',
            },
         ] as ConditionRow[],
      },
      onSubmit: async (values) => {},
   });

   const options = [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Draft', value: 'DRAFT' },
   ];

   const handleFieldChange = (
      index: number,
      field: keyof ConditionRow,
      value: string
   ) => {
      const rows = [...discountGroupForm.values.conditionSet];
      rows[index][field] = value;
      discountGroupForm.setFieldValue('conditionSet', rows);
      console.log(discountGroupForm.values, 'form values');
   };

   function removeConditionRow(index: number): void {
      if (discountGroupForm.values.conditionSet.length > 1) {
         const rows = [...discountGroupForm.values.conditionSet];
         rows.splice(index, 1);
         discountGroupForm.setFieldValue('conditionSet', rows);
      }
   }

   function addConditionRow(): void {
      const rows = [...discountGroupForm.values.conditionSet];

      rows.push({
         property_name: rows[rows.length - 1].property_name,
         property_value: rows[rows.length - 1].property_value,
         operator: '',
      });
      discountGroupForm.setFieldValue('conditionSet', rows);
   }

   const handleSelectChange = useCallback(
      (value: string) => setSelected(value),
      []
   );

   return (
      <Page
         backAction={{ url: '/app/discount-groups/' }}
         title="New Discount Group"
         compactTitle
         primaryAction={{ content: 'Save', disabled: true }}
      >
         <Layout>
            <Layout.Section>
               <BlockStack gap={'400'}>
                  <Card>
                     <Form onSubmit={discountGroupForm.handleSubmit}>
                        <FormLayout>
                           <TextField
                              value={discountGroupForm.values.handle}
                              onChange={(value) =>
                                 discountGroupForm.setFieldValue(
                                    'handle',
                                    value
                                 )
                              }
                              label="Handle Name"
                              type="text"
                              requiredIndicator
                              autoComplete="off"
                           />

                           <BlockStack gap={'200'}>
                              <Text as="h3">Conditions:</Text>
                              {discountGroupForm.values.conditionSet.length >
                                 0 &&
                                 discountGroupForm.values.conditionSet.map(
                                    (row, index) => (
                                       <InlineGrid
                                          key={`${index}_condition_row`}
                                          gap={'400'}
                                          columns={[
                                             'oneThird',
                                             'oneThird',
                                             'oneThird',
                                          ]}
                                       >
                                          <Select
                                             label="Property"
                                             labelHidden
                                             options={propertyNameOptions}
                                             onChange={(value) =>
                                                handleFieldChange(
                                                   index,
                                                   'property_name',
                                                   value
                                                )
                                             }
                                             value={row.property_name}
                                          />
                                          <Select
                                             label="Operator"
                                             labelHidden
                                             options={
                                                propertyOperatorsMap[
                                                   row.property_name as keyof typeof propertyOperatorsMap
                                                ]
                                             }
                                             onChange={(value) =>
                                                handleFieldChange(
                                                   index,
                                                   'operator',
                                                   value
                                                )
                                             }
                                             value={row.operator}
                                          />
                                          <InlineStack gap={'400'} wrap={false}>
                                             <TextField
                                                label="Value"
                                                labelHidden
                                                value={row.property_value}
                                                autoComplete="off"
                                                onChange={(value) =>
                                                   handleFieldChange(
                                                      index,
                                                      'property_value',
                                                      value
                                                   )
                                                }
                                             />
                                             {discountGroupForm.values
                                                .conditionSet.length > 1 && (
                                                <Button
                                                   icon={MinusIcon}
                                                   onClick={() =>
                                                      removeConditionRow(index)
                                                   }
                                                   accessibilityLabel="Add theme"
                                                />
                                             )}
                                          </InlineStack>
                                       </InlineGrid>
                                    )
                                 )}
                              <Button onClick={() => addConditionRow()}>
                                 Add another condition
                              </Button>
                           </BlockStack>
                        </FormLayout>
                     </Form>
                  </Card>
                  <Card>
                     <Text variant="headingMd" as="h3">
                        Products
                     </Text>
                     <ProductIndexTable
                        products={loaderData.products.products.nodes}
                     />
                  </Card>
               </BlockStack>
            </Layout.Section>
            <Layout.Section variant="oneThird">
               <Card>
                  <Select
                     label="Status"
                     options={options}
                     onChange={handleSelectChange}
                     value={selected}
                  />
               </Card>
            </Layout.Section>
         </Layout>
      </Page>
   );
}

function ProductIndexTable({ products }) {
   const resourceName = {
      singular: 'product',
      plural: 'products',
   };

   const rowMarkup = products.map((product, index) => (
      <IndexTable.Row id={product.id} key={product.id}>
         <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold" as="span">
               {product.title}
            </Text>
         </IndexTable.Cell>
         <IndexTable.Cell>
            {product.featuredImage ? (
               <img
                  src={product.featuredImage.url}
                  alt={product.title}
                  style={{ maxWidth: '40px',borderRadius:'4px',aspectRatio:"1/1",objectFit:"cover" }}
               />
            ) : (
               'No Image'
            )}
         </IndexTable.Cell>
      </IndexTable.Row>
   ));

   return (
      <IndexTable
         resourceName={resourceName}
         itemCount={products.length}
         headings={[{ title: 'Title' }, { title: 'Featured Image' }]}
      >
         {rowMarkup}
      </IndexTable>
   );
}

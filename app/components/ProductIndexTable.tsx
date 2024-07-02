import {
  Badge,
  Bleed,
  BlockStack,
  Card,
  EmptyState,
  IndexTable,
  InlineStack,
  Text,
  Thumbnail,
  useIndexResourceState,
} from '@shopify/polaris';
import { ConditionRow, Product } from '~/common/types';
import { ImageIcon } from '@shopify/polaris-icons';
import { imgUrl } from '~/common/utils';
import { useEffect } from 'react';

type ComponentProps = {
  products: Product[] | undefined | null;
  loading: boolean;
  selectedIds?: string[];
  onSelectionChange: (selectedIds: string[]) => void;
};

export default function ProductIndexTable({
  products,
  loading,
  selectedIds = [],
  onSelectionChange,
}: ComponentProps) {
  //console.log(products?.length, products, 'products length');
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(
    products as Product[],
    {
      selectedResources: selectedIds,
    }
  );

  useEffect(() => {
    onSelectionChange(selectedResources);
  }, [selectedResources]);

  if (products === undefined || products === null) return null;

  const resourceName = {
    singular: 'product',
    plural: 'products',
  };

  const rowMarkup = products.map(
    ({ id, display_name, variant_img, price, availability }, index) => (
      <IndexTable.Row id={id} key={id} position={index} selected={selectedResources.includes(id)}>
        <IndexTable.Cell>
          <InlineStack gap={'300'} blockAlign={'center'}>
            {variant_img ? (
              <Thumbnail source={imgUrl(variant_img, 'small')} size="small" alt={display_name} />
            ) : (
              <Thumbnail source={ImageIcon} alt={display_name} size="small" />
            )}
            <Text variant="bodyMd" as="span">
              {display_name}
            </Text>
          </InlineStack>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            $ {price}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {availability ? <Badge tone={'success'}>Available</Badge> : <Badge>Sold Out</Badge>}
        </IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  return (
    <Card>
      <BlockStack gap={'400'}>
        <Text variant="headingMd" as="h3">
          Filtered Products
        </Text>
        <Bleed marginInline={'400'}>
          <IndexTable
            resourceName={resourceName}
            itemCount={products.length}
            selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            headings={[{ title: 'Product' }, { title: 'Price' }, { title: 'Availability' }]}
            loading={loading}
          >
            {rowMarkup}
          </IndexTable>
        </Bleed>
      </BlockStack>
    </Card>
  );
}

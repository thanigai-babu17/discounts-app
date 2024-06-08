import { redirect } from '@remix-run/node';
import {
  Card,
  IndexTable,
  useIndexResourceState,
  Text,
  Badge,
  Bleed,
  IndexFilters,
} from '@shopify/polaris';
import { APP_LABELS, DiscountGroup } from '~/common/types';

type ComponentProps = {
  discounts: DiscountGroup[];
};

export default function DiscountGroupIndexTable({ discounts }: ComponentProps) {
  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(
    discounts as DiscountGroup[]
  );

  const resourceName = {
    singular: 'discount group',
    plural: 'discount groups',
  };
  console.log(discounts, 'groups');
  const rowMarkup = discounts.map(
    (
      {
        id,
        handle,
        subDiscountType,
        subDiscountVal,
        status,
        oneTimeDiscountType,
        oneTimeDiscountVal,
      },
      index
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        position={index}
        selected={selectedResources.includes(id)}
        onNavigation={() => {}}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            {handle}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {status === 'ACTIVE' ? (
            <Badge tone={'success'}>Active</Badge>
          ) : (
            <Badge tone={'info'}>Draft</Badge>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge>{`${subDiscountVal} ${APP_LABELS[subDiscountType as keyof typeof APP_LABELS]}`}</Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge>{`${oneTimeDiscountVal} ${APP_LABELS[oneTimeDiscountType as keyof typeof APP_LABELS]}`}</Badge>
        </IndexTable.Cell>
      </IndexTable.Row>
    )
  );
  return (
    <Card>
      <Bleed marginInline={'400'} marginBlock={'400'}>
        <IndexTable
          resourceName={resourceName}
          itemCount={discounts.length}
          selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: 'Handle' },
            { title: 'Status' },
            { title: 'Subscription' },
            { title: 'One-Time' },
          ]}
          loading={false}
        >
          {rowMarkup}
        </IndexTable>
      </Bleed>
    </Card>
  );
}

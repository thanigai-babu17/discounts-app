import { Link } from '@remix-run/react';
import {
  Card,
  IndexTable,
  useIndexResourceState,
  Text,
  Badge,
  Bleed,
  Button,
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

  const rowMarkup = discounts.map(
    (
      {
        id,
        handle,
        sub_discount_type,
        sub_discount_value,
        status,
        onetime_discount_type,
        onetime_discount_value,
      },
      index
    ) => (
      <IndexTable.Row id={id} key={id} position={index} selected={selectedResources.includes(id)}>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            <Link
              className={'Polaris-Link Polaris-Link--monochrome Polaris-Link--removeUnderline'}
              to={`/app/discount-groups/${id}`}
              data-primary-link={true}
              data-polaris-unstyled={true}
            >
              {handle}
            </Link>
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
          <Badge>{`${sub_discount_value} ${APP_LABELS[sub_discount_type as keyof typeof APP_LABELS]}`}</Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge>{`${onetime_discount_value} ${APP_LABELS[onetime_discount_type as keyof typeof APP_LABELS]}`}</Badge>
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

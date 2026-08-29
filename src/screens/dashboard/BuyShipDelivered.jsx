import React from 'react';
import FilteredOrderList from '@/components/orders/FilteredOrderList';
import { getOrderBucket } from '@/lib/orderMath';

export default function BuyShipDelivered() {
  return (
    <FilteredOrderList
      title="Delivered"
      /* The web filtered on `status === 'Delivered'`, which missed orders that
         reached shipmentStatusScore 7 without the string being written.
         getOrderBucket handles both. */
      predicate={(o) => getOrderBucket(o) === 'Delivered'}
      emptyTitle="Nothing delivered yet"
      emptySubtitle="Completed orders will appear here."
    />
  );
}

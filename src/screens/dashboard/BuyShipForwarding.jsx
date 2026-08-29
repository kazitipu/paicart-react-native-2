import React from 'react';
import FilteredOrderList from '@/components/orders/FilteredOrderList';

export default function BuyShipForwarding() {
  return (
    <FilteredOrderList
      title="Forwarding Parcel"
      predicate={(o) => o.status === 'Forwarding' || !!o.forwardingParcel}
      emptyTitle="No forwarding parcels"
      emptySubtitle="Parcels being forwarded will appear here."
    />
  );
}

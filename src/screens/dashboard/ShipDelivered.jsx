import React from 'react';
import FilteredShipmentList from '@/components/shipping/FilteredShipmentList';
import { isDeliveredRecord } from '@/lib/refund';

export default function ShipDelivered() {
  return (
    <FilteredShipmentList
      title="Delivered Shipments"
      predicate={isDeliveredRecord}
      emptyTitle="Nothing delivered yet"
      emptySubtitle="Completed shipments will appear here."
    />
  );
}

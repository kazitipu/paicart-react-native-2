import React from 'react';
import FilteredShipmentList from '@/components/shipping/FilteredShipmentList';

export default function ShipForwarding() {
  return (
    <FilteredShipmentList
      title="Forwarding Parcel"
      predicate={(r) => r.status === 'Forwarding' || !!r.forwardingParcel}
      emptyTitle="No forwarding parcels"
      emptySubtitle="Parcels being forwarded will appear here."
    />
  );
}

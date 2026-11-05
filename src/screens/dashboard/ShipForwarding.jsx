import React from 'react';
import { Truck } from 'lucide-react-native';
import FilteredShipmentList from '@/components/shipping/FilteredShipmentList';

/* Web ship-for-me/my-forwarding-parcel/page.jsx — status 'Forwarding' or a
   forwardingParcel flag, purple tile, the tracking number. */
const isForwarding = (s) => s.status === 'Forwarding' || !!s.forwardingParcel;
const trackingLine = (item) => item.trackingNo || 'No tracking';

export default function ShipForwarding() {
  return (
    <FilteredShipmentList
      title="Ship For Me - Forwarding Parcels"
      predicate={isForwarding}
      Icon={Truck}
      tint="#faf5ff"
      iconColor="#9333ea"
      emptyText="No forwarding parcels"
      subtitle={trackingLine}
    />
  );
}

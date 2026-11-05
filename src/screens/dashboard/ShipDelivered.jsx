import React from 'react';
import { CheckCircle } from 'lucide-react-native';
import FilteredShipmentList, { timeDate } from '@/components/shipping/FilteredShipmentList';

/* Web ship-for-me/my-delivered/page.jsx — status === 'Delivered', green tile,
   the booking date as `toLocaleDateString()`. */
const isDelivered = (s) => s.status === 'Delivered';

export default function ShipDelivered() {
  return (
    <FilteredShipmentList
      title="Ship For Me - Delivered"
      predicate={isDelivered}
      Icon={CheckCircle}
      tint="#f0fdf4"
      iconColor="#16a34a"
      emptyText="No delivered shipments yet"
      subtitle={timeDate}
    />
  );
}

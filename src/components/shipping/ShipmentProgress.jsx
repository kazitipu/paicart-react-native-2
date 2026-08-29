import React from 'react';
import { View, Text } from 'react-native';
import {
  Clock, BadgeCheck, Warehouse, PlaneTakeoff, Ship, ShieldCheck, Building2, PackageCheck,
} from 'lucide-react-native';
import { stepsFor, stepIndexFor, READY_STEP_INDEX } from '@/lib/shipForMe';
import { isSeaShipment } from '@/lib/shipment';
import colors from '@/theme/colors';

const ICONS = [Clock, BadgeCheck, Warehouse, PlaneTakeoff, ShieldCheck, Building2, PackageCheck];

/* Vertical on a phone: seven milestones do not fit across a narrow screen the
   way the web's horizontal stepper did. */
export default function ShipmentProgress({ score = 1, req, dates = {} }) {
  const isSea = isSeaShipment(req);
  const steps = stepsFor(isSea);
  const current = stepIndexFor(score);

  return (
    <View>
      {steps.map((label, i) => {
        /* Only the ready-for-departure milestone changes icon by mode. */
        const Icon = isSea && i === READY_STEP_INDEX ? Ship : ICONS[i];
        const done = i <= current;
        const isLast = i === steps.length - 1;
        return (
          <View key={label} className="flex-row">
            <View className="items-center mr-3">
              <View
                className="w-7 h-7 rounded-full items-center justify-center"
                style={{ backgroundColor: done ? colors.primary : '#e5e7eb' }}
              >
                <Icon size={13} color={done ? '#ffffff' : colors.muted} />
              </View>
              {!isLast && (
                <View
                  className="w-0.5 flex-1 my-1"
                  style={{ backgroundColor: i < current ? colors.primary : '#e5e7eb' }}
                />
              )}
            </View>
            <View className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
              <Text
                className={`text-smd ${done ? 'font-bold text-foreground' : 'text-gray-400'}`}
              >
                {label}
              </Text>
              {!!dates[label] && (
                <Text className="text-xxs text-gray-400 mt-0.5">{dates[label]}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

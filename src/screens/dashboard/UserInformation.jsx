import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { User, Building2, MapPin, Plus, Trash2, Pencil, Check } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import Field from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import PhoneInput from '@/components/PhoneInput';
import Sheet from '@/components/ui/Sheet';
import { updateUser } from '@/lib/firebaseUtils';
import { getRedxAreas } from '@/lib/api';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

const bdAddress = require('@bangladeshi/bangladesh-address/build/src/index');

const TABS = [
  { key: 'personal', label: 'Personal', Icon: User },
  { key: 'company', label: 'Company', Icon: Building2 },
  { key: 'address', label: 'Address Book', Icon: MapPin },
];

const BUSINESS_TYPES = ['Retail', 'Wholesale', 'Manufacturer', 'Online Seller', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];

const emptyAddress = () => ({
  id: String(Date.now()),
  name: '',
  phone: '',
  district: '',
  area: null,
  address: '',
  isDefault: false,
});

export default function UserInformation() {
  const navigation = useNavigation();
  const route = useRoute();
  const currentUser = useSelector((s) => s.user?.currentUser);

  /* `?from=place-order` on the web opened the Address tab and returned to
     checkout on save. */
  const fromPlaceOrder = route.params?.from === 'place-order';
  const [tab, setTab] = useState(fromPlaceOrder ? 'address' : 'personal');

  const [personal, setPersonal] = useState({ displayName: '', gender: '', mobileNo: '' });
  const [company, setCompany] = useState({
    company: '', businessType: '', companyAddress: '', companyMobile: '',
  });
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [areas, setAreas] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setPersonal({
      displayName: currentUser.displayName || '',
      gender: currentUser.gender || '',
      mobileNo: currentUser.mobileNo || '',
    });
    setCompany({
      company: currentUser.company || '',
      businessType: currentUser.businessType || '',
      companyAddress: currentUser.companyAddress || '',
      companyMobile: currentUser.companyMobile || '',
    });
    setAddresses(currentUser.addressBook || []);
  }, [currentUser]);

  const districts = useMemo(() => {
    try {
      return bdAddress.allDistricts().sort();
    } catch {
      return [];
    }
  }, []);

  /* The area object is stored whole on the address: place-order later reads
     `area.id` as RedX's `delivery_area_id`. */
  useEffect(() => {
    if (!editing?.district) {
      setAreas([]);
      return;
    }
    let alive = true;
    getRedxAreas(editing.district)
      .then((a) => alive && setAreas(a || []))
      .catch(() => alive && setAreas([]));
    return () => {
      alive = false;
    };
  }, [editing?.district]);

  const persist = async (patch, message) => {
    setSaving(true);
    try {
      await updateUser({ ...currentUser, ...patch });
      toast.success(message);
      return true;
    } catch {
      toast.error('Could not save. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async () => {
    if (!editing.name.trim() || !editing.phone.trim() || !editing.address.trim()) {
      toast.error('Name, phone and address are required.');
      return;
    }
    if (!editing.district) {
      toast.error('Please select a district.');
      return;
    }

    const exists = addresses.some((a) => a.id === editing.id);
    let next = exists
      ? addresses.map((a) => (a.id === editing.id ? editing : a))
      : [...addresses, editing];

    /* Exactly one default. The first address added becomes it automatically —
       checkout has nothing to ship to otherwise. */
    if (editing.isDefault || next.length === 1) {
      next = next.map((a) => ({ ...a, isDefault: a.id === editing.id }));
    }

    setAddresses(next);
    const ok = await persist({ addressBook: next }, 'Address saved');
    if (ok) {
      setEditing(null);
      if (fromPlaceOrder) navigation.navigate('CartTab', { screen: 'PlaceOrder' });
    }
  };

  const removeAddress = async (id) => {
    const next = addresses.filter((a) => a.id !== id);
    /* Never leave the book without a default. */
    if (next.length && !next.some((a) => a.isDefault)) next[0].isDefault = true;
    setAddresses(next);
    await persist({ addressBook: next }, 'Address removed');
  };

  const makeDefault = async (id) => {
    const next = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    setAddresses(next);
    await persist({ addressBook: next }, 'Default shipping address updated');
  };

  return (
    <DashboardLayout title="Profile" scroll={false}>
      <View className="flex-row bg-white border-b border-gray-100">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className="flex-1 items-center py-3"
            >
              <t.Icon size={15} color={active ? colors.primary : colors.muted} />
              <Text
                className={`text-2xs mt-1 ${active ? 'text-primary font-bold' : 'text-gray-500'}`}
              >
                {t.label}
              </Text>
              {active && <View className="h-0.5 w-8 bg-primary rounded-full mt-1.5" />}
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerClassName="p-3 pb-10 gap-4" keyboardShouldPersistTaps="handled">
        {tab === 'personal' && (
          <>
            <Field
              label="Full name"
              value={personal.displayName}
              onChangeText={(v) => setPersonal((p) => ({ ...p, displayName: v }))}
            />
            <Select
              label="Gender"
              value={personal.gender}
              options={GENDERS}
              onChange={(v) => setPersonal((p) => ({ ...p, gender: v }))}
            />
            <View>
              <Text className="text-2xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                Mobile number
              </Text>
              <PhoneInput
                value={personal.mobileNo}
                onChangeText={(v) => setPersonal((p) => ({ ...p, mobileNo: v }))}
              />
            </View>
            <Button
              title="Save changes"
              loading={saving}
              onPress={() => persist(personal, 'Profile updated')}
            />
          </>
        )}

        {tab === 'company' && (
          <>
            <Field
              label="Company name"
              value={company.company}
              onChangeText={(v) => setCompany((p) => ({ ...p, company: v }))}
            />
            <Select
              label="Business type"
              value={company.businessType}
              options={BUSINESS_TYPES}
              onChange={(v) => setCompany((p) => ({ ...p, businessType: v }))}
            />
            <Field
              label="Company address"
              value={company.companyAddress}
              onChangeText={(v) => setCompany((p) => ({ ...p, companyAddress: v }))}
              multiline
            />
            <View>
              <Text className="text-2xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                Company mobile
              </Text>
              <PhoneInput
                value={company.companyMobile}
                onChangeText={(v) => setCompany((p) => ({ ...p, companyMobile: v }))}
              />
            </View>
            <Button
              title="Save changes"
              loading={saving}
              onPress={() => persist(company, 'Company details updated')}
            />
          </>
        )}

        {tab === 'address' && (
          <>
            {addresses.map((a) => (
              <View key={a.id} className="bg-white rounded-xl border border-gray-100 p-3">
                <View className="flex-row items-start">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-smd font-bold text-foreground">{a.name}</Text>
                      {a.isDefault && (
                        <View className="bg-primary-tint rounded-full px-2 py-0.5">
                          <Text className="text-xxs font-bold text-primary">Default</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-2xs text-gray-500 mt-0.5">{a.phone}</Text>
                    <Text className="text-2xs text-gray-500 mt-0.5">
                      {[a.address, a.area?.name, a.district].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                  <View className="flex-row gap-1">
                    <Pressable onPress={() => setEditing(a)} hitSlop={6} className="p-1.5">
                      <Pencil size={14} color={colors.muted} />
                    </Pressable>
                    <Pressable onPress={() => removeAddress(a.id)} hitSlop={6} className="p-1.5">
                      <Trash2 size={14} color={colors.muted} />
                    </Pressable>
                  </View>
                </View>
                {!a.isDefault && (
                  <Pressable
                    onPress={() => makeDefault(a.id)}
                    className="flex-row items-center gap-1.5 mt-2 self-start"
                  >
                    <Check size={12} color={colors.primary} />
                    <Text className="text-2xs font-semibold text-primary">
                      Set as default shipping
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}

            <Pressable
              onPress={() => setEditing(emptyAddress())}
              className="flex-row items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 py-4"
            >
              <Plus size={15} color={colors.primary} />
              <Text className="text-smd font-semibold text-primary">Add an address</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={addresses.some((a) => a.id === editing?.id) ? 'Edit address' : 'Add address'}
        headerColor={colors.primary}
        footer={<Button title="Save address" loading={saving} onPress={saveAddress} />}
      >
        {editing && (
          <View className="gap-4">
            <Field
              label="Recipient name"
              value={editing.name}
              onChangeText={(v) => setEditing((p) => ({ ...p, name: v }))}
            />
            <View>
              <Text className="text-2xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                Phone
              </Text>
              <PhoneInput
                value={editing.phone}
                onChangeText={(v) => setEditing((p) => ({ ...p, phone: v }))}
              />
            </View>
            <Select
              label="District"
              value={editing.district}
              options={districts}
              onChange={(v) => setEditing((p) => ({ ...p, district: v, area: null }))}
            />
            {areas.length > 0 ? (
              <Select
                label="Area"
                value={editing.area?.id}
                options={areas.map((a) => ({ value: a.id, label: a.name }))}
                onChange={(id) =>
                  setEditing((p) => ({ ...p, area: areas.find((a) => a.id === id) || null }))
                }
              />
            ) : editing.district ? (
              <Text className="text-2xs text-gray-400">
                Areas are unavailable right now — delivery will be quoted at a standard rate.
              </Text>
            ) : null}
            <Field
              label="Street address"
              value={editing.address}
              onChangeText={(v) => setEditing((p) => ({ ...p, address: v }))}
              multiline
              placeholder="House, road, landmark"
            />
            <Pressable
              onPress={() => setEditing((p) => ({ ...p, isDefault: !p.isDefault }))}
              className="flex-row items-center gap-2"
            >
              <View
                className="w-5 h-5 rounded border-2 items-center justify-center"
                style={{
                  borderColor: editing.isDefault ? colors.primary : '#d1d5db',
                  backgroundColor: editing.isDefault ? colors.primary : 'transparent',
                }}
              >
                {editing.isDefault && <Check size={12} color="#ffffff" strokeWidth={3} />}
              </View>
              <Text className="text-smd text-foreground">Use as default shipping address</Text>
            </Pressable>
          </View>
        )}
      </Sheet>
    </DashboardLayout>
  );
}

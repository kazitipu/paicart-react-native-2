import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { User, Building2, MapPin, Save, Plus, Trash2, Phone, Mail, X } from 'lucide-react-native';
import DashboardLayout, { useDashboardKeyboard } from '@/components/DashboardLayout';
import Avatar from '@/components/Avatar';
import { C, SHADOW, ORANGE, Press, Spinner } from '@/components/product/ui';
import { TS, tpx, RED, BODY, Checkbox } from '@/components/cart/CartBits';
import {
  CARD, GRAY50, PAGE_GAP, ORANGE_SHADOW, Field, Input, SelectBox, OrangeButton, PickerSheet,
} from '@/components/profile/ProfileBits';
import { updateUser, requestAccountDeletion } from '@/lib/firebaseUtils';
import { signOutEverywhere } from '@/lib/firebase';
import { DeleteAccountCard, DeleteAccountSheet } from '@/components/profile/DeleteAccount';
import { getRedxAreas } from '@/lib/api';
import {
  DISTRICT_ALIASES, toWebAddress, toWebBook, isDefaultShipping, addrPhone, addrThana, addrDivision,
} from '@/lib/address';
import { toast } from '@/lib/toast';
import { TABS as NAV_TABS } from '@/navigation/routes';
import { goHome } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   Port of web src/app/pages/dashboard/user/information/page.jsx (< 640px).

   Inside DashboardLayout "My Profile": the "back to checkout" banner (only
   when opened from Place Order), the orange profile hero with its 3-cell
   quick-info strip, the 3-way pill tab bar, and one white card holding the
   Personal / Company / Address Book tab.

   Writes are the web's, field for field:
   - Personal → updateUser({ ...currentUser, displayName, gender, mobileNo })
   - Company  → updateUser({ ...currentUser, company: { name, businessType,
                address, mobileNo } })
   - Addresses → updateUser({ ...currentUser, addressBook }) with every entry
                in the web schema (lib/address).

   Native additions: tapping an address card opens the same inline form
   prefilled ("Edit Address") — the web can only add/delete; pickers are
   in-screen bottom sheets (searchable for districts and areas); press
   feedback, a sliding tab indicator, fades.

   RedX areas: fetched straight from RedX (lib/api getRedxAreas), as the
   web does, so every address gets its RedX `areaObj`. If the call fails
   the Area / Thana picker falls back to the district's thanas/upazilas
   from the address package and the address is saved with `areaObj: null`.
   ═══════════════════════════════════════════════════════════════════════ */

const bdAddress = require('@bangladeshi/bangladesh-address/build/src/index');

const TABS = [
  { id: 'personal', label: 'Personal', Icon: User },
  { id: 'company', label: 'Company', Icon: Building2 },
  { id: 'address', label: 'Addresses', Icon: MapPin },
];

const AMBER50 = '#fffbeb';
const AMBER200 = '#fde68a';
const AMBER400 = '#fbbf24';
const AMBER700 = '#b45309';
const AMBER800 = '#92400e';
const RED100 = '#fee2e2';
const RED200 = '#fecaca';
const GREEN500 = '#22c55e';
const INK = '#1C1C1C';

const opts = (placeholder, values) => [{ value: '', label: placeholder }, ...values.map((v) => ({ value: v, label: v }))];

/* ── Personal Info Tab ── */
function PersonalTab({ currentUser, openPicker, pickerKey }) {
  const [form, setForm] = useState(() => ({
    displayName: currentUser?.displayName || '',
    gender: currentUser?.gender || '',
    mobileNo: currentUser?.mobileNo || '',
  }));
  const [loading, setLoading] = useState(false);
  const initial = useRef(form).current;

  const handleSubmit = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      await updateUser({ ...currentUser, ...form });
      toast.success('Personal info updated!');
    } catch {
      toast.error('Failed to update. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Field label="Full Name">
        <Input
          defaultValue={initial.displayName}
          onChangeText={(v) => setForm((f) => ({ ...f, displayName: v }))}
          placeholder="Your full name"
          autoCapitalize="words"
        />
      </Field>
      <Field label="Email Address">
        <Input value={currentUser?.email || ''} editable={false} icon={Mail} iconColor={C.gray300} />
      </Field>
      <Field label="Gender">
        <SelectBox
          label={form.gender || 'Select gender'}
          open={pickerKey === 'gender'}
          onPress={() =>
            openPicker({
              key: 'gender',
              title: 'Gender',
              options: opts('Select gender', ['Male', 'Female', 'Other']),
              value: form.gender,
              onSelect: (v) => setForm((f) => ({ ...f, gender: v })),
            })
          }
        />
      </Field>
      <Field label="Mobile Number">
        <Input
          defaultValue={initial.mobileNo}
          onChangeText={(v) => setForm((f) => ({ ...f, mobileNo: v }))}
          placeholder="01XXXXXXXXX"
          icon={Phone}
          keyboardType="phone-pad"
        />
      </Field>
      <View style={{ paddingTop: 8 }}>
        <OrangeButton Icon={Save} label="Save Changes" loading={loading} onPress={handleSubmit} />
      </View>
    </View>
  );
}

/* ── Company Info Tab ── */
function CompanyTab({ currentUser }) {
  const [form, setForm] = useState(() => ({
    name: currentUser?.company?.name || '',
    businessType: currentUser?.company?.businessType || '',
    address: currentUser?.company?.address || '',
    mobileNo: currentUser?.company?.mobileNo || '',
  }));
  const [loading, setLoading] = useState(false);
  const initial = useRef(form).current;
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      await updateUser({ ...currentUser, company: form });
      toast.success('Company info updated!');
    } catch {
      toast.error('Failed to update. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Field label="Company / Store Name">
        <Input defaultValue={initial.name} onChangeText={set('name')} placeholder="Your company name" />
      </Field>
      <Field label="Business Type">
        <Input defaultValue={initial.businessType} onChangeText={set('businessType')} placeholder="e.g. Retailer, Wholesaler…" />
      </Field>
      <Field label="Company Address">
        <Input defaultValue={initial.address} onChangeText={set('address')} placeholder="Full company address" />
      </Field>
      <Field label="Company Mobile">
        <Input
          defaultValue={initial.mobileNo}
          onChangeText={set('mobileNo')}
          placeholder="01XXXXXXXXX"
          icon={Phone}
          keyboardType="phone-pad"
        />
      </Field>
      <View style={{ paddingTop: 8 }}>
        <OrangeButton Icon={Save} label="Save Changes" loading={loading} onPress={handleSubmit} />
      </View>
    </View>
  );
}

/* ── Address Book Tab ── */
const EMPTY_FORM = {
  addName: '', addMobileNo: '', division: '', district: '',
  thana: '', addAddress: '', defaultShipping: false, defaultBilling: false,
};

/* Used only while RedX returns no areas (see header comment). */
const localThanas = (district) => {
  if (!district) return [];
  let names = [];
  try {
    names = [...(bdAddress.thanaNamesOf?.(district) || []), ...(bdAddress.upazilaNamesOf?.(district) || [])];
  } catch {
    names = [];
  }
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
};

function AddressCard({ addr, book, deleting, onDelete, onSetDefault, onEdit }) {
  const isDefault = isDefaultShipping(addr, book);
  return (
    <Press
      onPress={onEdit}
      accessibilityLabel={`Edit address ${addr.name || ''}`}
      style={({ pressed }) => ({
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDefault ? 'rgba(230,34,34,0.4)' : C.gray100,
        backgroundColor: '#ffffff',
        boxShadow: isDefault ? SHADOW.base : undefined,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ borderRadius: 15, overflow: 'hidden' }}>
        {isDefault && <View style={{ height: 4, backgroundColor: ORANGE }} />}

        <View style={{ padding: 14, backgroundColor: isDefault ? 'rgba(255,247,237,0.4)' : '#ffffff' }}>
          {/* Top row: name + delete */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDefault ? ORANGE : C.gray100,
                }}
              >
                <MapPin size={13} color={isDefault ? '#ffffff' : C.gray400} />
              </View>
              <Text style={[TS.sm, { fontWeight: '700', color: C.gray800, flexShrink: 1 }]} numberOfLines={1}>
                {addr.name}
              </Text>
            </View>
            <Press
              onPress={onDelete}
              disabled={deleting}
              hitSlop={6}
              accessibilityLabel="Delete address"
              style={({ pressed }) => ({ padding: 6, borderRadius: 8, backgroundColor: pressed ? C.red50 : 'transparent' })}
            >
              {({ pressed }) =>
                deleting ? <Spinner size={13} color={C.gray300} /> : <Trash2 size={13} color={pressed ? C.red500 : C.gray300} />
              }
            </Press>
          </View>

          {/* Address details */}
          <View style={{ paddingLeft: 36, gap: 2 }}>
            <Text style={[TS.xs, { lineHeight: 16.5, color: C.gray600 }]}>{addr.address}</Text>
            <Text style={[TS.xs, { color: C.gray500 }]}>
              {addrThana(addr)}, {addr.district}, {addrDivision(addr)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 }}>
              <Phone size={9} color={C.gray400} />
              <Text style={[TS.xs, { color: C.gray500 }]}>{addrPhone(addr)}</Text>
            </View>
          </View>

          {/* Bottom row: badges + set default */}
          <View style={{ paddingLeft: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flexShrink: 1 }}>
              {isDefault && <Badge bg={ORANGE} label="DEFAULT SHIPPING" />}
              {!!addr.defaultBilling && <Badge bg={GREEN500} label="DEFAULT BILLING" />}
            </View>
            {!isDefault && (
              <Press onPress={onSetDefault} hitSlop={8}>
                {({ pressed }) => (
                  <Text style={[tpx(10), { fontWeight: '700', color: RED, textDecorationLine: pressed ? 'underline' : 'none' }]}>
                    Set as Default
                  </Text>
                )}
              </Press>
            )}
          </View>
        </View>
      </View>
    </Press>
  );
}

function Badge({ bg, label }) {
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
      <Text style={[tpx(9), { color: '#ffffff', fontWeight: '700', letterSpacing: 0.225 }]}>{label}</Text>
    </View>
  );
}

function AddressBook({ currentUser, onDone, openPicker, pickerKey }) {
  const kb = useDashboardKeyboard();
  const book = useMemo(() => currentUser?.addressBook || [], [currentUser?.addressBook]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // the (web-shaped) address being edited, or null for a new one
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [allAreas, setAllAreas] = useState([]);
  const [areaObj, setAreaObj] = useState(null);
  const [areasLoading, setAreasLoading] = useState(false);
  const fetchSeq = useRef(0);
  const formRef = useRef(null);

  const divisions = useMemo(() => (bdAddress.allDivision ? bdAddress.allDivision() : []), []);
  const districts = form.division
    ? bdAddress.DivisionName?.[form.division]
      ? bdAddress.districtsOf?.(bdAddress.DivisionName[form.division]) || []
      : bdAddress.districtsOf?.(form.division) || []
    : [];
  const redxNames = useMemo(
    () => [...allAreas].sort((a, b) => a.name.localeCompare(b.name)).map((a) => a.name),
    [allAreas],
  );
  const areaNames = allAreas.length ? redxNames : areasLoading ? [] : localThanas(form.district);

  const fetchAreas = async (districtName) => {
    const seq = ++fetchSeq.current;
    setAreasLoading(true);
    const alias = DISTRICT_ALIASES[districtName] || districtName;
    try {
      const areas = await getRedxAreas(alias);
      if (seq === fetchSeq.current) setAllAreas(areas || []);
    } catch {
      if (seq === fetchSeq.current) setAllAreas([]);
    } finally {
      if (seq === fetchSeq.current) setAreasLoading(false);
    }
  };

  const resetForm = () => {
    fetchSeq.current += 1;
    setForm(EMPTY_FORM);
    setAllAreas([]);
    setAreaObj(null);
    setAreasLoading(false);
    setEditing(null);
    setShowForm(false);
  };

  const openForm = (addr) => {
    fetchSeq.current += 1;
    if (addr) {
      const a = toWebAddress(addr, book);
      setEditing(a);
      setForm({
        addName: a.name || '',
        addMobileNo: a.mobileNo || '',
        division: a.division || '',
        district: a.district || '',
        thana: a.thana || '',
        addAddress: a.address || '',
        defaultShipping: isDefaultShipping(addr, book),
        defaultBilling: !!a.defaultBilling,
      });
      setAreaObj(a.areaObj || null);
      setAllAreas([]);
      if (a.district) fetchAreas(a.district);
      else setAreasLoading(false);
    } else {
      setEditing(null);
      setForm(EMPTY_FORM);
      setAreaObj(null);
      setAllAreas([]);
      setAreasLoading(false);
    }
    setFormKey((k) => k + 1);
    setShowForm(true);
    setTimeout(() => kb?.reveal(formRef), 120);
  };

  const handleSave = async () => {
    const { addName, addMobileNo, division, district, thana, addAddress } = form;
    const needsArea = allAreas.length > 0;
    if (!addName || !addMobileNo || !division || !district || !thana || !addAddress || (needsArea && !areaObj)) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const fields = {
        name: addName,
        address: addAddress,
        mobileNo: addMobileNo,
        division,
        district,
        thana,
        areaObj: areaObj || null,
        defaultShipping: form.defaultShipping,
        defaultBilling: form.defaultBilling,
      };
      let next = toWebBook(book);
      if (form.defaultShipping) next = next.map((a) => ({ ...a, defaultShipping: false }));
      if (form.defaultBilling) next = next.map((a) => ({ ...a, defaultBilling: false }));
      if (editing) {
        next = next.map((a) => (a.id === editing.id ? { ...editing, ...fields } : a));
      } else {
        next = [...next, { id: parseInt(Math.random() * 10000, 10), ...fields }];
      }
      await updateUser({ ...currentUser, addressBook: next });
      toast.success(editing ? 'Address updated!' : 'Address added!');
      resetForm();
      onDone?.();
    } catch {
      toast.error(editing ? 'Failed to update address.' : 'Failed to add address.');
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (addr) => {
    const book2 = toWebBook(book).map((a) => ({
      ...a,
      defaultShipping: a.id === addr.id,
      defaultBilling: a.id === addr.id,
    }));
    await updateUser({ ...currentUser, addressBook: book2 });
    toast.success('Default address updated!');
    onDone?.();
  };

  const deleteAddress = async (addr) => {
    setDeleting(addr.id);
    try {
      const book2 = toWebBook(book).filter((a) => a.id !== addr.id);
      await updateUser({ ...currentUser, addressBook: book2 });
      toast.success('Address removed');
      if (editing?.id === addr.id) resetForm();
    } catch {
      toast.error('Failed to remove address.');
    } finally {
      setDeleting(null);
    }
  };

  const pickDivision = () =>
    openPicker({
      key: 'division',
      title: 'Division',
      options: opts('Select Division', divisions),
      value: form.division,
      onSelect: (v) => setForm((f) => ({ ...f, division: v, district: '', thana: '' })),
    });
  const pickDistrict = () =>
    openPicker({
      key: 'district',
      title: 'District',
      searchable: districts.length > 8,
      options: opts('Select District', districts),
      value: form.district,
      onSelect: (v) => {
        setForm((f) => ({ ...f, district: v, thana: '' }));
        fetchAreas(v);
      },
    });
  const pickArea = () =>
    openPicker({
      key: 'area',
      title: 'Area / Thana',
      searchable: areaNames.length > 8,
      options: opts('Select Area', areaNames),
      value: form.thana,
      onSelect: (v) => {
        const found = allAreas.find((a) => a.name === v);
        setForm((f) => ({ ...f, thana: v }));
        if (found) setAreaObj(found);
        else if (editing && editing.district === form.district && editing.thana === v) setAreaObj(editing.areaObj || null);
        else setAreaObj(null);
      },
    });

  return (
    <View style={{ gap: 10 }}>
      {/* Address cards */}
      {book.length > 0 ? (
        book.map((addr, i) => (
          <Animated.View key={addr.id ?? i} entering={FadeIn.duration(220)}>
            <AddressCard
              addr={addr}
              book={book}
              deleting={deleting === addr.id}
              onDelete={() => deleteAddress(addr)}
              onSetDefault={() => setDefault(addr)}
              onEdit={() => openForm(addr)}
            />
          </Animated.View>
        ))
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <View
            style={{ width: 56, height: 56, backgroundColor: C.gray100, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
          >
            <MapPin size={24} color={C.gray300} />
          </View>
          <Text style={[TS.sm, { fontWeight: '500', color: C.gray400 }]}>No saved addresses</Text>
          <Text style={[TS.xs, { color: C.gray300, marginTop: 2 }]}>Add an address to get started</Text>
        </View>
      )}

      {/* Add address toggle */}
      {!showForm ? (
        <Press
          onPress={() => openForm(null)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: 'rgba(230,34,34,0.3)',
            borderRadius: 16,
            padding: 14,
            backgroundColor: pressed ? 'rgba(254,242,242,0.5)' : 'transparent',
          })}
        >
          <Plus size={16} color={RED} />
          <Text style={[TS.sm, { fontWeight: '700', color: RED }]}>Add New Address</Text>
        </Press>
      ) : (
        <Animated.View
          ref={formRef}
          collapsable={false}
          entering={FadeIn.duration(220)}
          style={{ borderWidth: 1, borderColor: C.gray100, borderRadius: 16, boxShadow: SHADOW.base }}
        >
          <View style={{ borderRadius: 15, overflow: 'hidden' }}>
            {/* Form header */}
            <View
              style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: INK }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MapPin size={14} color="#ffffff" />
                <Text style={[TS.sm, { color: '#ffffff', fontWeight: '700' }]}>{editing ? 'Edit Address' : 'New Address'}</Text>
              </View>
              <Press onPress={resetForm} hitSlop={10} accessibilityLabel="Close">
                {({ pressed }) => <X size={16} color={pressed ? '#ffffff' : 'rgba(255,255,255,0.8)'} />}
              </Press>
            </View>

            <View key={formKey} style={{ padding: 16, gap: 12, backgroundColor: 'rgba(249,250,251,0.5)' }}>
              <Field label="Full Name *">
                <Input
                  defaultValue={form.addName}
                  onChangeText={(v) => setForm((f) => ({ ...f, addName: v }))}
                  placeholder="Recipient name"
                  autoCapitalize="words"
                />
              </Field>
              <Field label="Mobile Number *">
                <Input
                  defaultValue={form.addMobileNo}
                  onChangeText={(v) => setForm((f) => ({ ...f, addMobileNo: v }))}
                  placeholder="01XXXXXXXXX"
                  keyboardType="phone-pad"
                />
              </Field>

              <Field label="Division *">
                <SelectBox
                  label={form.division || 'Select Division'}
                  open={pickerKey === 'division'}
                  chevron={13}
                  chevronRight={12}
                  onPress={pickDivision}
                />
              </Field>

              <Field label="District *">
                <SelectBox
                  label={form.district || (form.division ? 'Select District' : 'Select Division first')}
                  open={pickerKey === 'district'}
                  disabled={!form.division}
                  chevron={13}
                  chevronRight={12}
                  onPress={pickDistrict}
                />
              </Field>

              <Field label="Area / Thana *">
                <SelectBox
                  label={form.thana || (areasLoading ? 'Loading…' : form.district ? 'Select Area' : 'Select District first')}
                  open={pickerKey === 'area'}
                  disabled={!form.district || areasLoading}
                  loading={areasLoading}
                  chevron={13}
                  chevronRight={12}
                  onPress={pickArea}
                />
              </Field>

              <Field label="Street Address *">
                <Input
                  defaultValue={form.addAddress}
                  onChangeText={(v) => setForm((f) => ({ ...f, addAddress: v }))}
                  placeholder="e.g. Floor 6A, 431/12 North Jatrabari…"
                />
              </Field>

              <View style={{ flexDirection: 'row', gap: 16, paddingTop: 4 }}>
                {[
                  { k: 'defaultShipping', label: 'Default Shipping' },
                  { k: 'defaultBilling', label: 'Default Billing' },
                ].map(({ k, label }) => {
                  const toggle = () => setForm((f) => ({ ...f, [k]: !f[k] }));
                  return (
                    <Press key={k} onPress={toggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Checkbox checked={form[k]} onPress={toggle} size={16} accessibilityLabel={label} />
                      <Text style={[TS.xs, { fontWeight: '500', color: C.gray600 }]}>{label}</Text>
                    </Press>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
                <OrangeButton Icon={Save} label="Save Address" loading={saving} onPress={handleSave} px={20} iconSize={14} self="stretch" />
                <Press
                  onPress={resetForm}
                  style={({ pressed }) => ({
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.gray200,
                    backgroundColor: pressed ? GRAY50 : 'transparent',
                    justifyContent: 'center',
                  })}
                >
                  <Text style={[TS.sm, { fontWeight: '700', color: C.gray600 }]}>Cancel</Text>
                </Press>
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/* ── Tab bar: `flex bg-white rounded-2xl shadow-sm border p-1 gap-1`; the
   active pill (`bg-[#FF6A00] shadow-md shadow-orange-200`) slides between
   tabs. The pill is decorative — the tabs themselves never move. ── */
function TabBar({ active, onChange }) {
  const [w, setW] = useState(0);
  const idx = TABS.findIndex((t) => t.id === active);
  const pos = useSharedValue(idx);
  useEffect(() => {
    pos.value = withTiming(idx, { duration: 240, easing: Easing.bezier(0.32, 0.72, 0, 1) });
  }, [idx, pos]);
  const tabW = w ? (w - 2 - 8 - 8) / 3 : 0;
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * (tabW + 4) }] }));

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ ...CARD, flexDirection: 'row', padding: 4, gap: 4 }}
    >
      {tabW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 4, bottom: 4, left: 4, width: tabW, borderRadius: 12, backgroundColor: ORANGE, boxShadow: ORANGE_SHADOW },
            pill,
          ]}
        />
      )}
      {TABS.map(({ id, label, Icon }) => {
        const on = id === active;
        return (
          <Press
            key={id}
            onPress={() => onChange(id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: !on && pressed ? GRAY50 : 'transparent',
            })}
          >
            {({ pressed }) => {
              const color = on ? '#ffffff' : pressed ? C.gray700 : C.gray500;
              return (
                <>
                  <Icon size={13} color={color} />
                  <Text style={[TS.xs, { fontWeight: '700', color }]}>{label}</Text>
                </>
              );
            }}
          </Press>
        );
      })}
    </View>
  );
}

export default function UserInformation() {
  const navigation = useNavigation();
  const route = useRoute();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const fromPlaceOrder = route.params?.from === 'place-order';

  const [activeTab, setActiveTab] = useState(fromPlaceOrder ? 'address' : 'personal');
  /* A later Place Order → here jump lands on an already-mounted screen. */
  useEffect(() => {
    if (fromPlaceOrder) setActiveTab('address');
  }, [fromPlaceOrder]);

  const [picker, setPicker] = useState(null);
  const openPicker = (p) => setPicker(p);
  const closePicker = () => setPicker(null);

  /* ── Account deletion request ── */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await requestAccountDeletion(currentUser);
    } catch {
      setDeleting(false);
      toast.error('Could not submit your request. Please try again or contact support@paicart.com.');
      return;
    }
    /* The request is saved; signing out is best-effort from here. */
    try {
      await signOutEverywhere(); // Providers' auth listener clears user, cart and wishlist
    } catch {
      /* the request still stands */
    }
    setDeleting(false);
    setDeleteOpen(false);
    toast.success('Account deletion requested. You have been signed out.');
    goHome();
  };

  const backToCheckout = () => {
    navigation.setParams({ from: undefined });
    navigation.navigate(NAV_TABS.CART, { screen: 'PlaceOrder' });
  };
  const handleAddressDone = () => {
    if (fromPlaceOrder) backToCheckout();
  };

  const strip = [
    { Icon: Mail, label: 'Email', value: currentUser?.email?.split('@')[0] || '—' },
    { Icon: Phone, label: 'Mobile', value: currentUser?.mobileNo || 'Not set' },
    { Icon: Building2, label: 'Company', value: currentUser?.company?.name || 'Not set' },
  ];

  return (
    <DashboardLayout
      webChrome
      title="My Profile"
      overlays={
        <>
        <DeleteAccountSheet
          visible={deleteOpen}
          loading={deleting}
          onClose={() => setDeleteOpen(false)}
          onConfirm={confirmDelete}
        />
        <PickerSheet
          visible={!!picker}
          title={picker?.title}
          options={picker?.options || []}
          value={picker?.value}
          searchable={!!picker?.searchable}
          onClose={closePicker}
          onSelect={(v) => {
            picker?.onSelect(v);
            closePicker();
          }}
        />
        </>
      }
    >
      <View style={{ gap: PAGE_GAP }}>
        {/* ── Return-to-place-order banner ── */}
        {fromPlaceOrder && (
          <Animated.View
            entering={FadeIn.duration(220)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              backgroundColor: AMBER50,
              borderWidth: 1,
              borderColor: AMBER200,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, flexShrink: 1 }}>
              <View style={{ width: 28, height: 28, backgroundColor: AMBER400, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={13} color="#ffffff" />
              </View>
              <Text style={[TS.xs, { lineHeight: 16.5, fontWeight: '600', color: AMBER800, flexShrink: 1 }]}>
                Add or select a <Text style={{ fontWeight: '800' }}>default shipping address</Text> to continue your order.
              </Text>
            </View>
            <Press onPress={backToCheckout} hitSlop={8}>
              {({ pressed }) => (
                <Text
                  style={[tpx(11), { fontWeight: '700', color: pressed ? '#78350f' : AMBER700, textDecorationLine: 'underline' }]}
                  numberOfLines={1}
                >
                  ← Back
                </Text>
              )}
            </Press>
          </Animated.View>
        )}

        {/* ── Profile hero card ── */}
        <Animated.View entering={FadeIn.duration(250)} style={{ borderRadius: 16, boxShadow: SHADOW.base }}>
          <View style={{ borderRadius: 16, overflow: 'hidden' }}>
            <View style={{ backgroundColor: ORANGE, paddingHorizontal: 20, paddingVertical: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Avatar
                  user={currentUser}
                  editable
                  ringClass="border-2 border-white/30"
                  ringStyle={{ boxShadow: SHADOW.lg }}
                  textStyle={{ color: BODY }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 18, lineHeight: 22.5, fontWeight: '800', color: '#ffffff' }} numberOfLines={1}>
                    {currentUser?.displayName || 'Guest User'}
                  </Text>
                  {!!currentUser?.email && (
                    <Text style={[TS.xs, { color: RED100, marginTop: 2 }]} numberOfLines={1}>
                      {currentUser.email}
                    </Text>
                  )}
                  {!!currentUser?.mobileNo && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Phone size={9} color={RED200} />
                      <Text style={[tpx(10), { color: RED200 }]}>{currentUser.mobileNo}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Quick info strip */}
            <View style={{ backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: C.gray100, flexDirection: 'row' }}>
              {strip.map(({ Icon, label, value }, i) => (
                <View
                  key={label}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderLeftWidth: i ? 1 : 0,
                    borderLeftColor: C.gray100,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon size={9} color={C.gray400} />
                    <Text style={[tpx(9), { color: C.gray400, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.225 }]}>
                      {label}
                    </Text>
                  </View>
                  <Text style={[tpx(11), { fontWeight: '700', color: C.gray700, marginTop: 2 }]} numberOfLines={1}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Tab bar ── */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* ── Tab content ── */}
        <View style={{ ...CARD, padding: 20 }}>
          <Animated.View key={`${activeTab}-${currentUser?.id || ''}`} entering={FadeIn.duration(200)}>
            {activeTab === 'personal' && (
              <PersonalTab currentUser={currentUser} openPicker={openPicker} pickerKey={picker?.key} />
            )}
            {activeTab === 'company' && <CompanyTab currentUser={currentUser} />}
            {activeTab === 'address' && (
              <AddressBook currentUser={currentUser} onDone={handleAddressDone} openPicker={openPicker} pickerKey={picker?.key} />
            )}
          </Animated.View>
        </View>

        {/* ── Delete account (Google Play requirement; not on the web) ── */}
        <DeleteAccountCard currentUser={currentUser} onPress={() => setDeleteOpen(true)} />
      </View>
    </DashboardLayout>
  );
}

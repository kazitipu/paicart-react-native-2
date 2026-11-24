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
import { updateUser } from '@/lib/firebaseUtils';
import {
  toWebAddress, toWebBook, isDefaultShipping, addrPhone,
} from '@/lib/address';
import {
  addressAreaLine, buildPathaoAddress, getPathaoAreas, getPathaoCities, getPathaoZones,
} from '@/lib/pathaoLocations';
import { toast } from '@/lib/toast';
import SearchablePicker from '@/components/address/SearchablePicker';
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

   Delivery location: Pathao City → Zone / Thana → Area, loaded from
   Paicart's Cloud Functions (lib/pathaoLocations), and saved with
   buildPathaoAddress so every address carries the Pathao ids the admin
   panel books with. Area is required only when the zone has areas.
   Addresses saved before this (no `pathao`) show a "re-add" hint; editing
   one asks for its Pathao location again.
   ═══════════════════════════════════════════════════════════════════════ */

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
  addName: '', addMobileNo: '', cityId: '', zoneId: '', areaId: '',
  addAddress: '', defaultShipping: false, defaultBilling: false,
};
const EMPTY_LOC = { cities: [], zones: [], areas: [], loading: '', error: '' };
const AMBER600 = '#d97706';

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
            {!!addressAreaLine(addr) && <Text style={[TS.xs, { color: C.gray500 }]}>{addressAreaLine(addr)}</Text>}
            {!addr.pathao && (
              <Text style={[tpx(10), { fontWeight: '600', color: AMBER600 }]}>Re-add this address to pick its Pathao delivery area</Text>
            )}
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

function AddressBook({ currentUser, onDone }) {
  const kb = useDashboardKeyboard();
  const book = useMemo(() => currentUser?.addressBook || [], [currentUser?.addressBook]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // the (web-shaped) address being edited, or null for a new one
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  /* Pathao city → zone → area (via Paicart's server — lib/pathaoLocations) */
  const [loc, setLoc] = useState(EMPTY_LOC);
  const seq = useRef(0); // drops answers that arrive after a newer pick
  const formRef = useRef(null);

  useEffect(() => {
    if (!showForm || loc.cities.length) return undefined;
    let alive = true;
    setLoc((l) => ({ ...l, loading: 'cities', error: '' }));
    getPathaoCities()
      .then((cities) => alive && setLoc((l) => ({ ...l, cities, loading: l.loading === 'cities' ? '' : l.loading })))
      .catch((e) => alive && setLoc((l) => ({ ...l, loading: '', error: e.message })));
    return () => {
      alive = false;
    };
  }, [showForm, loc.cities.length]);

  const loadZones = async (cityId, keep = {}) => {
    const n = ++seq.current;
    setForm((f) => ({ ...f, cityId, zoneId: keep.zoneId || '', areaId: keep.areaId || '' }));
    setLoc((l) => ({ ...l, zones: [], areas: [], loading: cityId ? 'zones' : '', error: '' }));
    if (!cityId) return;
    try {
      const zones = await getPathaoZones(cityId);
      if (n !== seq.current) return;
      setLoc((l) => ({ ...l, zones, loading: keep.zoneId ? 'areas' : '' }));
      if (keep.zoneId) loadAreas(keep.zoneId, keep, n);
    } catch (e) {
      if (n === seq.current) setLoc((l) => ({ ...l, loading: '', error: e.message }));
    }
  };

  const loadAreas = async (zoneId, keep = {}, n0) => {
    const n = n0 || ++seq.current;
    setForm((f) => ({ ...f, zoneId, areaId: keep.areaId || '' }));
    setLoc((l) => ({ ...l, areas: [], loading: zoneId ? 'areas' : '', error: '' }));
    if (!zoneId) return;
    try {
      const areas = await getPathaoAreas(zoneId);
      if (n === seq.current) setLoc((l) => ({ ...l, areas, loading: '' }));
    } catch (e) {
      if (n === seq.current) setLoc((l) => ({ ...l, loading: '', error: e.message }));
    }
  };

  const city = loc.cities.find((c) => String(c.id) === String(form.cityId)) || null;
  const zone = loc.zones.find((z) => String(z.id) === String(form.zoneId)) || null;
  const area = loc.areas.find((a) => String(a.id) === String(form.areaId)) || null;

  const resetForm = () => {
    seq.current += 1;
    setForm(EMPTY_FORM);
    setLoc((l) => ({ ...EMPTY_LOC, cities: l.cities }));
    setEditing(null);
    setShowForm(false);
  };

  const openForm = (addr) => {
    seq.current += 1;
    setLoc((l) => ({ ...EMPTY_LOC, cities: l.cities }));
    if (addr) {
      const a = toWebAddress(addr, book);
      const pl = a.pathao || null;
      setEditing(a);
      setForm({
        ...EMPTY_FORM,
        addName: a.name || '',
        addMobileNo: a.mobileNo || '',
        addAddress: a.address || '',
        defaultShipping: isDefaultShipping(addr, book),
        defaultBilling: !!a.defaultBilling,
      });
      /* a Pathao-era address reopens on its city / zone / area */
      if (pl && pl.cityId) {
        loadZones(String(pl.cityId), {
          zoneId: pl.zoneId ? String(pl.zoneId) : '',
          areaId: pl.areaId ? String(pl.areaId) : '',
        });
      }
    } else {
      setEditing(null);
      setForm(EMPTY_FORM);
    }
    setFormKey((k) => k + 1);
    setShowForm(true);
    setTimeout(() => kb?.reveal(formRef), 120);
  };

  const handleSave = async () => {
    const { addName, addMobileNo, addAddress } = form;
    if (!addName.trim() || !addMobileNo.trim() || !city || !zone || !addAddress.trim() || (loc.areas.length > 0 && !area)) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(addMobileNo.replace(/\D/g, '').replace(/^880/, '0'))) {
      toast.error('Enter a valid mobile number (01XXXXXXXXX)');
      return;
    }
    if (addAddress.trim().length < 10) {
      toast.error('Street address must be at least 10 characters');
      return;
    }
    setSaving(true);
    try {
      const built = buildPathaoAddress({
        id: editing ? editing.id : undefined,
        name: addName,
        mobileNo: addMobileNo,
        address: addAddress,
        city,
        zone,
        area,
        defaultShipping: form.defaultShipping,
        defaultBilling: form.defaultBilling,
      });
      let next = toWebBook(book);
      if (form.defaultShipping) next = next.map((a) => ({ ...a, defaultShipping: false }));
      if (form.defaultBilling) next = next.map((a) => ({ ...a, defaultBilling: false }));
      if (editing) {
        next = next.map((a) => (a.id === editing.id ? built : a));
      } else {
        next = [...next, built];
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

  const cityOptions = useMemo(() => loc.cities.map((c) => ({ value: String(c.id), label: c.name })), [loc.cities]);
  const zoneOptions = useMemo(() => loc.zones.map((z) => ({ value: String(z.id), label: z.name })), [loc.zones]);
  const areaOptions = useMemo(() => loc.areas.map((a) => ({ value: String(a.id), label: a.name })), [loc.areas]);
  /* the profile's <SelectBox> look: white, red border + ring while open */
  const pickerLook = {
    accent: RED,
    fieldStyle: { backgroundColor: '#ffffff', paddingLeft: 16, paddingRight: 36 },
    pressedBg: GRAY50,
    openStyle: { boxShadow: '0 0 0 2px rgba(230,34,34,0.3)' },
    chevronSize: 13,
    chevronRight: 12,
  };
  const areaOptional = !!(loc.zones.length && form.zoneId && !loc.areas.length && loc.loading !== 'areas');

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

              <Field label="City *">
                <SearchablePicker
                  {...pickerLook}
                  title="City"
                  label={city ? city.name : loc.loading === 'cities' ? 'Loading…' : 'Select City'}
                  options={cityOptions}
                  value={form.cityId}
                  disabled={loc.loading !== 'cities' && !loc.cities.length}
                  loading={loc.loading === 'cities'}
                  onSelect={(v) => loadZones(v)}
                />
              </Field>

              <Field label="Zone / Thana *">
                <SearchablePicker
                  {...pickerLook}
                  title="Zone / Thana"
                  label={zone ? zone.name : loc.loading === 'zones' ? 'Loading…' : form.cityId ? 'Select Zone' : 'Select City first'}
                  options={zoneOptions}
                  value={form.zoneId}
                  disabled={!form.cityId}
                  loading={loc.loading === 'zones'}
                  onSelect={(v) => loadAreas(v)}
                />
              </Field>

              <Field label={areaOptional ? 'Area' : 'Area *'}>
                <SearchablePicker
                  {...pickerLook}
                  title="Area"
                  label={
                    area
                      ? area.name
                      : loc.loading === 'areas'
                        ? 'Loading…'
                        : !form.zoneId
                          ? 'Select Zone first'
                          : loc.areas.length
                            ? 'Select Area'
                            : 'No areas — zone is enough'
                  }
                  options={areaOptions}
                  value={form.areaId}
                  disabled={!form.zoneId || (loc.loading !== 'areas' && !loc.areas.length)}
                  loading={loc.loading === 'areas'}
                  onSelect={(v) => setForm((f) => ({ ...f, areaId: v }))}
                />
              </Field>

              {area && area.homeDelivery === false && (
                <View style={{ borderRadius: 8, borderWidth: 1, borderColor: AMBER200, backgroundColor: AMBER50, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={[tpx(11), { fontWeight: '600', color: AMBER700 }]}>
                    Pathao doesn't deliver to the door in this area — choose a nearby area for home delivery, or use Office Pickup.
                  </Text>
                </View>
              )}
              {!!loc.error && (
                <View style={{ borderRadius: 8, borderWidth: 1, borderColor: RED200, backgroundColor: C.red50, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={[tpx(11), { fontWeight: '600', color: '#dc2626' }]}>{loc.error}</Text>
                </View>
              )}

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
              <AddressBook currentUser={currentUser} onDone={handleAddressDone} />
            )}
          </Animated.View>
        </View>
      </View>
    </DashboardLayout>
  );
}

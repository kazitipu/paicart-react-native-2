import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MapPin, Phone, Plus, X, ChevronDown, AlertTriangle } from 'lucide-react-native';
import { C, ORANGE, Press, Spinner, Radio } from '@/components/product/ui';
import { TS, tpx, BODY, Checkbox } from '@/components/cart/CartBits';
import { PickerSheet } from '@/components/profile/ProfileBits';
import { firestore, doc, updateDoc } from '@/lib/firebase';
import {
  toWebAddress, toWebBook, pickDefaultAddress, isDefaultShipping, addrPhone, addrLine,
} from '@/lib/address';
import {
  buildPathaoAddress, getPathaoAreas, getPathaoCities, getPathaoZones,
} from '@/lib/pathaoLocations';

/* ═══════════════════════════════════════════════════════════════════════
   Delivery address chooser for the Ship For Me and Buy For Me forms.

   Lists users/{uid}.addressBook, preselects the `defaultShipping` entry
   (lib/address pickDefaultAddress — the rule Place Order uses; the first
   Pathao entry when the default has no Pathao data) and lets the customer
   pick another or add one. Only Pathao addresses (with
   `pathao.cityId` + `pathao.zoneId`) can be chosen — the admin panel books
   the Pathao parcel straight from them. Older entries without `pathao` are
   shown greyed out with an "Update" link that reopens them in the form to
   pick their Pathao City → Zone → Area.

   New / updated entries are built with lib/pathaoLocations
   buildPathaoAddress (the profile screen's shape) and written to
   users/{uid}.addressBook (the whole book in the shared web shape, as the
   profile screen writes it). The saved entry is selected straight away.

   The chosen entry goes on the new record as `deliveryAddress`, run through
   toWebAddress like Place Order's `deliveryAddress`.

   The City / Zone / Area lists open a PickerSheet that the SCREEN renders
   at its root (an Overlay is absolutely positioned in its parent, so it
   cannot live inside the scroll content): render <AddressPickerSheet> with
   the state `openPicker` sets.
   ═══════════════════════════════════════════════════════════════════════ */

export const isPathaoAddress = (a) => !!(a && a.pathao && a.pathao.cityId && a.pathao.zoneId);

const keyOf = (a, i) => (a && a.id != null ? String(a.id) : `idx-${i}`);

/* Key of the extra row for a previous request's address that is no longer
   in the book (Book Again). */
export const PREVIOUS_KEY = 'previous-request';

const norm = (v) => String(v || '').trim().toLowerCase();
/* Same entry: same id, or same name + mobile + street address. */
const sameAddress = (a, b) => {
  if (!a || !b) return false;
  if (a.id != null && b.id != null && String(a.id) === String(b.id)) return true;
  return (
    !!norm(a.address) &&
    norm(a.name) === norm(b.name) &&
    norm(addrPhone(a)) === norm(addrPhone(b)) &&
    norm(a.address) === norm(b.address)
  );
};

/* Selection state for one form. `deliveryAddress` is what the record saves
   (null while nothing usable is chosen).

   Which entry is selected, in order:
   1. the one the customer picked (or `initialKey`, e.g. a restored draft),
   2. the address `prefer()` was given (Book Again's old deliveryAddress):
      its match in the book, or — when it is no longer there but still has
      Pathao data — an extra row "From your previous request",
   3. the defaultShipping entry,
   4. the first Pathao entry in the book (the default lacks Pathao data).
   Entries without Pathao data are never selected. */
export function useDeliveryAddress(currentUser, initialKey = null) {
  const book = useMemo(
    () => (Array.isArray(currentUser?.addressBook) ? currentUser.addressBook : []),
    [currentUser?.addressBook],
  );
  /* The book just written, shown until the user snapshot brings it back. */
  const [localBook, setLocalBook] = useState(null);
  useEffect(() => setLocalBook(null), [book]);
  const list = localBook || book;

  const [pickedKey, setPickedKey] = useState(initialKey || null);
  const [preferred, setPreferred] = useState(null);

  const entries = useMemo(() => {
    const rows = list.map((a, i) => ({ a, key: keyOf(a, i), index: i, usable: isPathaoAddress(a) }));
    if (preferred && isPathaoAddress(preferred) && !list.some((a) => sameAddress(a, preferred))) {
      rows.push({ a: preferred, key: PREVIOUS_KEY, index: -1, usable: true, previous: true });
    }
    return rows;
  }, [list, preferred]);

  const def = pickDefaultAddress(list);
  const usable = entries.filter((e) => e.usable);
  const chosen =
    usable.find((e) => e.key === pickedKey) ||
    (preferred ? usable.find((e) => e.key === PREVIOUS_KEY || sameAddress(e.a, preferred)) : null) ||
    usable.find((e) => e.a === def) ||
    usable.find((e) => !e.previous) ||
    null;

  /* Prefer a previous request's address (null clears it). Drops the
     customer's own pick so the preference takes effect. */
  const prefer = useCallback((a) => {
    setPreferred(a && typeof a === 'object' ? a : null);
    setPickedKey(null);
  }, []);

  return {
    list,
    entries,
    selectedKey: chosen ? chosen.key : null,
    selected: chosen ? chosen.a : null,
    deliveryAddress: chosen ? toWebAddress(chosen.a) : null,
    select: setPickedKey,
    prefer,
    setLocalBook,
  };
}

/* Root-level sheet for the City / Zone / Area lists. */
export function AddressPickerSheet({ picker, onClose }) {
  return (
    <PickerSheet
      visible={!!picker}
      title={picker?.title || ''}
      options={picker?.options || []}
      value={picker?.value ?? ''}
      searchable={!!picker?.searchable}
      onSelect={(v) => {
        const p = picker;
        onClose();
        p?.onSelect?.(v);
      }}
      onClose={onClose}
    />
  );
}

const EMPTY_FORM = { name: '', mobileNo: '', address: '', cityId: '', zoneId: '', areaId: '', defaultShipping: false };
const EMPTY_LOC = { cities: [], zones: [], areas: [], loading: '', error: '' };

/* Uncontrolled text box (`w-full border border-gray-200 rounded-xl px-3.5
   py-2.5 text-sm bg-gray-50`, the forms' input), registered with the
   screen's keyboard handler so it scrolls clear of the keyboard. */
function AddrInput({ kb, accent, defaultValue, onChangeText, ...rest }) {
  const inner = useRef(null);
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        { height: 42, borderWidth: 1, borderRadius: 12, justifyContent: 'center', backgroundColor: C.gray50 },
        { borderColor: focused ? accent : C.gray200 },
      ]}
    >
      <TextInput
        ref={inner}
        defaultValue={defaultValue}
        onChangeText={onChangeText}
        placeholderTextColor={C.gray300}
        onFocus={() => {
          setFocused(true);
          kb?.focus(inner);
        }}
        onBlur={() => {
          setFocused(false);
          kb?.blur(inner);
        }}
        style={{ height: 40, paddingVertical: 0, paddingHorizontal: 14, fontSize: 14, color: BODY, includeFontPadding: false }}
        {...rest}
      />
    </View>
  );
}

function AddrSelect({ label, onPress, disabled, open, loading, accent }) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height: 42,
        borderWidth: 1,
        borderRadius: 12,
        justifyContent: 'center',
        borderColor: open ? accent : C.gray200,
        backgroundColor: pressed ? C.gray100 : C.gray50,
        paddingLeft: 14,
        paddingRight: 32,
        opacity: disabled ? 0.7 : 1,
      })}
    >
      <Text style={[TS.sm, { color: BODY }]} numberOfLines={1}>
        {label}
      </Text>
      <View pointerEvents="none" style={{ position: 'absolute', right: 12 }}>
        {loading ? <Spinner size={14} color={C.gray400} /> : <ChevronDown size={14} color={C.gray500} />}
      </View>
    </Press>
  );
}

function FormLabel({ children }) {
  return <Text style={[TS.xs, { fontWeight: '700', color: C.gray700, marginBottom: 6 }]}>{children}</Text>;
}

function AddressRow({ entry, selected, book, accent, onPress, onUpdate }) {
  const { a, usable } = entry;
  const isDefault = isDefaultShipping(a, book);
  return (
    <Press
      onPress={usable ? onPress : undefined}
      disabled={!usable}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !usable }}
      accessibilityLabel={`Deliver to ${a.name || 'this address'}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? accent : C.gray200,
        backgroundColor: !usable ? C.gray50 : selected ? C.orange50 : pressed ? C.gray50 : '#ffffff',
      })}
    >
      <View style={{ marginTop: 2, opacity: usable ? 1 : 0.4 }}>
        <Radio selected={selected} color={accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={[TS.sm, { fontWeight: '700', color: usable ? C.gray800 : C.gray400, flexShrink: 1 }]}
            numberOfLines={1}
          >
            {a.name || 'Unnamed address'}
          </Text>
          {isDefault && !entry.previous && (
            <View style={{ backgroundColor: C.emerald50, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 }}>
              <Text style={[tpx(9), { fontWeight: '700', color: C.emerald600 }]}>DEFAULT</Text>
            </View>
          )}
        </View>
        {entry.previous && (
          <Text style={[tpx(10), { fontWeight: '600', color: C.gray500 }]}>From your previous request</Text>
        )}
        {!!addrLine(a) && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
            <MapPin size={11} color={C.gray400} style={{ marginTop: 2 }} />
            <Text style={[TS.xs, { color: usable ? C.gray500 : C.gray400, flex: 1 }]}>{addrLine(a)}</Text>
          </View>
        )}
        {!!addrPhone(a) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Phone size={10} color={C.gray400} />
            <Text style={[TS.xs, { color: usable ? C.gray500 : C.gray400 }]}>{addrPhone(a)}</Text>
          </View>
        )}
        {!usable && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
            <Text style={[tpx(10), { fontWeight: '600', color: C.amber600, flex: 1 }]}>
              Needs a Pathao delivery area before it can be used
            </Text>
            <Press onPress={onUpdate} hitSlop={8} accessibilityLabel="Update this address">
              {({ pressed }) => (
                <Text style={[tpx(11), { fontWeight: '700', color: accent, textDecorationLine: pressed ? 'underline' : 'none' }]}>
                  Update
                </Text>
              )}
            </Press>
          </View>
        )}
      </View>
    </Press>
  );
}

export default function DeliveryAddressPicker({
  currentUser,
  state,
  error,
  onChange,
  kb,
  openPicker,
  pickerKey,
  accent = ORANGE,
}) {
  const { list, entries, selectedKey, select, setLocalBook } = state;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // { entry } when updating an old address
  const [formKey, setFormKey] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loc, setLoc] = useState(EMPTY_LOC);
  const seq = useRef(0);

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

  const loadZones = async (cityId) => {
    const n = ++seq.current;
    setForm((f) => ({ ...f, cityId, zoneId: '', areaId: '' }));
    setLoc((l) => ({ ...l, zones: [], areas: [], loading: cityId ? 'zones' : '', error: '' }));
    if (!cityId) return;
    try {
      const zones = await getPathaoZones(cityId);
      if (n === seq.current) setLoc((l) => ({ ...l, zones, loading: '' }));
    } catch (e) {
      if (n === seq.current) setLoc((l) => ({ ...l, loading: '', error: e.message }));
    }
  };

  const loadAreas = async (zoneId) => {
    const n = ++seq.current;
    setForm((f) => ({ ...f, zoneId, areaId: '' }));
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
  const area = loc.areas.find((x) => String(x.id) === String(form.areaId)) || null;
  const areaOptional = !!(loc.zones.length && form.zoneId && !loc.areas.length && loc.loading !== 'areas');

  const openForm = (entry) => {
    seq.current += 1;
    setLoc((l) => ({ ...EMPTY_LOC, cities: l.cities }));
    setFormError('');
    if (entry) {
      const a = toWebAddress(entry.a, list);
      setEditing(entry);
      setForm({
        ...EMPTY_FORM,
        name: a.name || '',
        mobileNo: a.mobileNo || '',
        address: a.address || '',
        defaultShipping: isDefaultShipping(entry.a, list),
      });
    } else {
      setEditing(null);
      setForm({ ...EMPTY_FORM, defaultShipping: !list.some((a) => isPathaoAddress(a)) });
    }
    setFormKey((k) => k + 1);
    setShowForm(true);
  };

  const closeForm = () => {
    seq.current += 1;
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const handleSave = async () => {
    if (saving) return;
    if (!currentUser?.id) {
      setFormError('Please sign in to save an address.');
      return;
    }
    const { name, mobileNo, address } = form;
    if (!name.trim() || !mobileNo.trim() || !city || !zone || !address.trim() || (loc.areas.length > 0 && !area)) {
      setFormError('Please fill all required fields.');
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(mobileNo.replace(/\D/g, '').replace(/^880/, '0'))) {
      setFormError('Enter a valid mobile number (01XXXXXXXXX).');
      return;
    }
    if (address.trim().length < 10) {
      setFormError('Street address must be at least 10 characters.');
      return;
    }
    setFormError('');
    setSaving(true);
    const old = editing ? toWebAddress(editing.a, list) : null;
    const built = buildPathaoAddress({
      id: old && old.id != null ? old.id : undefined,
      name,
      mobileNo,
      address,
      city,
      zone,
      area,
      defaultShipping: form.defaultShipping,
      defaultBilling: old ? !!old.defaultBilling : false,
    });
    let next = toWebBook(list);
    if (form.defaultShipping) next = next.map((a) => ({ ...a, defaultShipping: false }));
    next = editing ? next.map((a, i) => (i === editing.index ? built : a)) : [...next, built];
    try {
      await updateDoc(doc(firestore, 'users', currentUser.id), { addressBook: next });
    } catch {
      setSaving(false);
      setFormError('Could not save the address. Please try again.');
      return;
    }
    setSaving(false);
    setLocalBook(next);
    select(String(built.id));
    onChange?.();
    closeForm();
  };

  const pickCity = () =>
    openPicker({
      key: 'addr-city',
      title: 'City',
      searchable: loc.cities.length > 8,
      options: [{ value: '', label: 'Select City' }, ...loc.cities.map((c) => ({ value: String(c.id), label: c.name }))],
      value: form.cityId,
      onSelect: (v) => loadZones(v),
    });
  const pickZone = () =>
    openPicker({
      key: 'addr-zone',
      title: 'Zone / Thana',
      searchable: loc.zones.length > 8,
      options: [{ value: '', label: 'Select Zone' }, ...loc.zones.map((z) => ({ value: String(z.id), label: z.name }))],
      value: form.zoneId,
      onSelect: (v) => loadAreas(v),
    });
  const pickArea = () =>
    openPicker({
      key: 'addr-area',
      title: 'Area',
      searchable: loc.areas.length > 8,
      options: [{ value: '', label: 'Select Area' }, ...loc.areas.map((x) => ({ value: String(x.id), label: x.name }))],
      value: form.areaId,
      onSelect: (v) => setForm((f) => ({ ...f, areaId: v })),
    });

  if (!currentUser?.id) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={[TS.xs, { color: C.gray500 }]}>Sign in to choose where we deliver your parcel.</Text>
        {!!error && <ErrorLine message={error} />}
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {entries.length > 0 ? (
        entries.map((entry) => (
          <AddressRow
            key={entry.key}
            entry={entry}
            book={list}
            accent={accent}
            selected={entry.key === selectedKey}
            onPress={() => {
              select(entry.key);
              onChange?.();
            }}
            onUpdate={() => openForm(entry)}
          />
        ))
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <MapPin size={28} color={C.gray200} style={{ marginBottom: 6 }} />
          <Text style={[TS.xs, { color: C.gray400 }]}>No delivery address saved yet</Text>
        </View>
      )}

      {!!error && <ErrorLine message={error} />}

      {!showForm ? (
        <Press
          onPress={() => openForm(null)}
          accessibilityLabel="Add new address"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: C.orange200,
            borderRadius: 12,
            paddingVertical: 11,
            backgroundColor: pressed ? C.orange50 : 'transparent',
          })}
        >
          <Plus size={14} color={accent} />
          <Text style={[TS.xs, { fontWeight: '700', color: accent }]}>Add New Address</Text>
        </Press>
      ) : (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{ borderWidth: 1, borderColor: C.gray200, borderRadius: 12, overflow: 'hidden' }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: C.gray50,
              borderBottomWidth: 1,
              borderBottomColor: C.gray100,
            }}
          >
            <Text style={[TS.xs, { fontWeight: '800', color: C.gray800 }]}>
              {editing ? 'Update Address' : 'New Address'}
            </Text>
            <Press onPress={closeForm} hitSlop={10} accessibilityLabel="Close">
              {({ pressed }) => <X size={15} color={pressed ? C.gray700 : C.gray400} />}
            </Press>
          </View>

          <View key={formKey} style={{ padding: 14, gap: 12 }}>
            <View>
              <FormLabel>Full Name *</FormLabel>
              <AddrInput
                kb={kb}
                accent={accent}
                defaultValue={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Recipient name"
                autoCapitalize="words"
              />
            </View>
            <View>
              <FormLabel>Mobile Number *</FormLabel>
              <AddrInput
                kb={kb}
                accent={accent}
                defaultValue={form.mobileNo}
                onChangeText={(v) => setForm((f) => ({ ...f, mobileNo: v }))}
                placeholder="01XXXXXXXXX"
                keyboardType="phone-pad"
              />
            </View>
            <View>
              <FormLabel>City *</FormLabel>
              <AddrSelect
                accent={accent}
                label={city ? city.name : loc.loading === 'cities' ? 'Loading…' : 'Select City'}
                open={pickerKey === 'addr-city'}
                disabled={loc.loading === 'cities' || !loc.cities.length}
                loading={loc.loading === 'cities'}
                onPress={pickCity}
              />
            </View>
            <View>
              <FormLabel>Zone / Thana *</FormLabel>
              <AddrSelect
                accent={accent}
                label={zone ? zone.name : loc.loading === 'zones' ? 'Loading…' : form.cityId ? 'Select Zone' : 'Select City first'}
                open={pickerKey === 'addr-zone'}
                disabled={!form.cityId || loc.loading === 'zones'}
                loading={loc.loading === 'zones'}
                onPress={pickZone}
              />
            </View>
            <View>
              <FormLabel>{areaOptional ? 'Area' : 'Area *'}</FormLabel>
              <AddrSelect
                accent={accent}
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
                open={pickerKey === 'addr-area'}
                disabled={!form.zoneId || loc.loading === 'areas' || !loc.areas.length}
                loading={loc.loading === 'areas'}
                onPress={pickArea}
              />
            </View>

            {area && area.homeDelivery === false && (
              <View style={{ borderRadius: 8, borderWidth: 1, borderColor: C.amber200, backgroundColor: C.amber50, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={[tpx(11), { fontWeight: '600', color: C.amber700 }]}>
                  Pathao doesn't deliver to the door in this area — choose a nearby area for home delivery, or use Office Pickup.
                </Text>
              </View>
            )}
            {!!loc.error && <ErrorLine message={loc.error} />}

            <View>
              <FormLabel>Street Address *</FormLabel>
              <AddrInput
                kb={kb}
                accent={accent}
                defaultValue={form.address}
                onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                placeholder="e.g. Floor 6A, 431/12 North Jatrabari…"
              />
            </View>

            <Press
              onPress={() => setForm((f) => ({ ...f, defaultShipping: !f.defaultShipping }))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Checkbox
                checked={form.defaultShipping}
                onPress={() => setForm((f) => ({ ...f, defaultShipping: !f.defaultShipping }))}
                size={16}
                accessibilityLabel="Set as default shipping address"
              />
              <Text style={[TS.xs, { fontWeight: '500', color: C.gray600 }]}>Set as default shipping address</Text>
            </Press>

            {!!formError && <ErrorLine message={formError} />}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Press
                onPress={handleSave}
                disabled={saving}
                accessibilityLabel="Save address"
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: accent,
                  opacity: saving ? 0.6 : pressed ? 0.85 : 1,
                })}
              >
                {saving && <Spinner size={14} color="#ffffff" />}
                <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>
                  {saving ? 'Saving…' : editing ? 'Save & Use' : 'Save & Use This Address'}
                </Text>
              </Press>
              <Press
                onPress={closeForm}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.gray200,
                  backgroundColor: pressed ? C.gray50 : '#ffffff',
                  justifyContent: 'center',
                })}
              >
                <Text style={[TS.sm, { fontWeight: '700', color: C.gray600 }]}>Cancel</Text>
              </Press>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function ErrorLine({ message }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: C.red200,
        backgroundColor: C.red50,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <AlertTriangle size={13} color={C.red600} />
      <Text style={[tpx(11), { fontWeight: '600', color: C.red600, flex: 1 }]}>{message}</Text>
    </View>
  );
}

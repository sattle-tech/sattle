/**
 * New group.
 *
 * The name is typed on the group's own cover, which takes its colour from
 * the name as it's typed (coverFor), so the group looks here the way it will
 * everywhere else.
 *
 * Names only. Nobody here needs the app, an email or a phone number: they
 * start as ghosts, and the group's link is how they see what they owe, pay
 * it, and join. Asking for more up front is where Splitwise loses the people
 * who never install. Creating it opens the group; its link is there, under
 * Add people.
 *
 * The group is kept in the currency its maker uses. Only someone who uses
 * both rupees and bitcoin is asked, from the chip on the cover, which opens
 * on the one they said new groups start in. A group's currency can't be
 * changed afterwards, since every amount in it is counted in that currency's
 * units.
 *
 * It starts without simplifying debts (SimplifyDebts.tsx), so debts first
 * read the way they were spent. The switch is on the group screen, beside
 * who pays whom, where what it does can be seen.
 *
 * The names can be typed straight down without leaving the keyboard: Enter
 * on the group's name goes to the people, and Enter on a person adds them
 * and stays there for the next, with the field kept in view as the list
 * above it grows.
 *
 * The keyboard comes up over the bottom of the screen, Create included. So
 * while it's up the screen ends above it (KeyboardBar, which on an iPhone
 * also puts it away), and Create is back once it's down.
 */

import React, { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isBitcoin } from '@sattle/core';
import { analytics } from '../analytics/analytics';
import { useScreenView } from '../analytics/useScreenView';
import { useCurrencyPrefs } from '../prefs/useCurrencyPrefs';
import { useAppData } from '../data/useAppData';
import { useActionKeys, useClient } from '../react/SattleProvider';
import { useBack } from './backNavigation';
import { CoverArt } from './CoverArt';
import { currencyNames } from './CurrencyPicker';
import { Avatar, Button, ErrorState, Glyph, KeyboardBar, Pill, useKeyboardCover } from './primitives';
import { coverFor, initialOf, makeStyles, radius, shadow, space, type, useColors } from './theme';

/**
 * On an iPhone the name field's own placeholder was cut off along the top at this size: "Name
 * your group" lost the top of its N. There it is drawn here instead, as text over the field, and
 * the field keeps its own, unseen, for a screen reader.
 */
const OWN_PLACEHOLDER = Platform.OS === 'ios';
/** The placeholder's ink, on the cover's colour. */
const PLACEHOLDER_INK = '#FFFFFFCC';

export interface NewGroupScreenProps {
  /** A name of the kind picked on Home, suggested in the name field. */
  example?: string;
  onBack: () => void;
  onCreated: (groupId: string) => void;
}

export function NewGroupScreen({ example, onBack, onCreated }: NewGroupScreenProps) {
  useScreenView('New group');
  const color = useColors();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const client = useClient();
  const appData = useAppData();
  const keys = useActionKeys();
  const prefs = useCurrencyPrefs();

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(prefs.newGroups);
  const [people, setPeople] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftField = useRef<TextInput>(null);
  const scroll = useRef<ScrollView>(null);
  const addingPeople = useRef(false);
  // The keyboard is up, over the foot of the screen.
  const keyboardOver = useKeyboardCover() > 0;
  // Its own header, so it says itself what Android's back button and the browser's do.
  useBack(onBack);

  const cover = coverFor(name);
  const choices = currencyNames(prefs.uses);
  const currencyLabel = choices.find((c) => c.value === currency)?.label ?? currency;
  // Whoever is typed but not yet added is in too: they were about to be.
  const everyone = [...people, ...(draft.trim() ? [draft.trim()] : [])];
  const total = everyone.length + 1;

  // While names are going in, the field they're typed in stays in view: each one added pushes it
  // down a row, and on a phone the keyboard leaves little room below.
  const keepAddInView = () => {
    if (addingPeople.current) scroll.current?.scrollToEnd({ animated: true });
  };

  const add = () => {
    const n = draft.trim();
    if (!n) return;
    setPeople((prev) => [...prev, n]);
    setDraft('');
    draftField.current?.focus();
  };

  const submit = async () => {
    if (!name.trim()) return setError('Give the group a name.');

    setBusy(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        currency,
        memberNames: everyone,
        simplifyDebts: false,
      };
      const group = await keys.run('create-group', input, (k) => client.createGroup(input, k));
      // The group opens with its people in it: one sync for it all, rather than a loading screen after.
      await appData.sync();
      onCreated(group.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the group.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.screen}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        // When a name is added, and when the keyboard comes up and leaves less room.
        onContentSizeChange={keepAddInView}
        onLayout={keepAddInView}
      >
        <View style={[s.cover, { backgroundColor: cover.bg, paddingTop: insets.top + space.md }]}>
          <CoverArt cover={cover} />
          <View style={s.bar}>
            <Glyph name="back" label="Back" onPress={onBack} ink="#FFFFFF" on="#00000029" weight={2.2} />
            <Text style={s.barTitle} accessibilityRole="header">
              New group
            </Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={s.nameRow}>
            <View style={s.tile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text style={[s.tileLetter, { color: cover.bg }]}>{initialOf(name)}</Text>
            </View>
            <View style={s.nameField}>
              <TextInput
                style={s.nameInput}
                value={name}
                onChangeText={setName}
                placeholder={example ?? 'Name your group'}
                placeholderTextColor={OWN_PLACEHOLDER ? 'transparent' : PLACEHOLDER_INK}
                accessibilityLabel="Group name"
                autoFocus
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => draftField.current?.focus()}
              />
              {OWN_PLACEHOLDER && !name && (
                <View
                  style={s.namePlaceholder}
                  pointerEvents="none"
                  accessibilityElementsHidden
                >
                  <Text style={s.namePlaceholderText} numberOfLines={1}>
                    {example ?? 'Name your group'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={s.chips}>
            <View style={s.chip}>
              <Glyph name="addPerson" ink="#FFFFFF" size={16} />
              <Text style={s.chipText}>{total === 1 ? 'Just you' : `${total} people`}</Text>
            </View>
            {choices.length > 1 ? (
              <Pressable
                onPress={() => {
                  analytics.tap('Kept in', { control: 'chip' });
                  const at = choices.findIndex((c) => c.value === currency);
                  setCurrency(choices[(at + 1) % choices.length]!.value);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Kept in ${currencyLabel}. Change`}
                style={({ pressed }) => [s.chip, pressed && { backgroundColor: '#00000040' }]}
              >
                <Text style={s.chipText}>{isBitcoin(currency) ? 'Bitcoin, in sats' : 'Rupees ₹'}</Text>
                <Glyph name="chevronDown" ink="#FFFFFF" size={14} weight={2.2} />
              </Pressable>
            ) : (
              <View style={s.chip}>
                <Text style={s.chipText}>{isBitcoin(currency) ? 'Bitcoin, in sats' : 'Rupees ₹'}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.h2}>Who’s in?</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Avatar name="You" me />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={s.rowName}>You</Text>
                <Text style={s.rowSub}>That’s you</Text>
              </View>
            </View>
            {people.map((p, i) => (
              <View key={`${p}-${i}`} style={[s.row, { paddingRight: space.xs }]}>
                <Avatar name={p} />
                <Text style={[s.rowName, { flex: 1, fontWeight: '500' }]}>{p}</Text>
                <Glyph
                  name="close"
                  label={`Remove ${p}`}
                  size={18}
                  ink={color.inkMuted}
                  onPress={() => setPeople((prev) => prev.filter((_, j) => j !== i))}
                />
              </View>
            ))}
            <View style={s.addRow}>
              <View style={s.addFace}>
                <Glyph name="plus" ink={color.inkMuted} size={16} weight={2.2} />
              </View>
              <TextInput
                ref={draftField}
                style={s.addInput}
                value={draft}
                onChangeText={setDraft}
                onFocus={() => {
                  addingPeople.current = true;
                  keepAddInView();
                }}
                onBlur={() => {
                  addingPeople.current = false;
                }}
                onSubmitEditing={add}
                returnKeyType={draft.trim() ? 'next' : 'done'}
                // With a name in it the keyboard stays up for the next one. The browser reads
                // blurOnSubmit, not submitBehavior, and blurs after Enter without it.
                submitBehavior={draft.trim() ? 'submit' : 'blurAndSubmit'}
                blurOnSubmit={!draft.trim()}
                placeholder="Add a name"
                placeholderTextColor={color.inkFaint}
                accessibilityLabel="Add a name"
              />
              <Pill label="Add" variant="soft" disabled={!draft.trim()} onPress={add} />
            </View>
          </View>

          <View style={s.info}>
            <Glyph name="link" ink={color.owed} size={18} />
            <Text style={s.infoText}>
              Just names for now. You’ll get one link to share. Each friend taps their own name. Nobody has to sign up.
            </Text>
          </View>
          {choices.length > 1 && (
            <Text style={s.note}>
              {isBitcoin(currency)
                ? 'Amounts are in sats, and people settle up over Lightning. This can’t be changed later.'
                : 'Amounts are in rupees, and people settle up by UPI or over Lightning. This can’t be changed later.'}
            </Text>
          )}

          {error && <ErrorState message={error} />}
        </View>
      </ScrollView>

      {!keyboardOver && (
        <View style={[s.footer, { paddingBottom: space.md + insets.bottom }]}>
          <Button label="Create" variant="primary" busy={busy} onPress={submit} />
        </View>
      )}
      <KeyboardBar />
    </View>
  );
}

const useStyles = makeStyles((color) => ({
  screen: { flex: 1, backgroundColor: color.paper },
  cover: { paddingHorizontal: space.lg + 4, paddingBottom: 40, gap: space.md + 2, overflow: 'hidden' },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2 },
  tile: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  tileLetter: { fontSize: 30, fontWeight: '800' },
  nameField: { flex: 1, minWidth: 0 },
  nameInput: {
    height: 48,
    // Android pads a field top and bottom from its theme unless told not to, and at this size
    // that left too little height for the text: it was cut off along the top and bottom.
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF66',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  // Over the field, down to its underline, set as the field sets what's typed.
  namePlaceholder: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 2, justifyContent: 'center' },
  namePlaceholderText: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, color: PLACEHOLDER_INK },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: '#00000029',
  },
  chipText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // Rises over the bottom of the cover, as on the group screen.
  body: {
    flexGrow: 1,
    marginTop: -20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: color.paper,
    paddingHorizontal: space.lg + 4,
    paddingTop: space.lg + 6,
    paddingBottom: space.xl,
    gap: space.sm + 2,
  },
  h2: { fontSize: 17, fontWeight: '700', color: color.ink },
  card: {
    backgroundColor: color.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    ...shadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  rowName: { fontSize: 15, fontWeight: '600', color: color.ink },
  rowSub: { fontSize: 12, color: color.inkMuted },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, paddingLeft: space.lg },
  addFace: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderWidth: 1,
    borderColor: color.lineStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    ...type.body,
    color: color.ink,
    backgroundColor: color.surface,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm + 2,
    paddingVertical: space.md,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.md + 2,
    backgroundColor: color.surfaceSunken,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19, color: color.ink },
  note: { fontSize: 13, lineHeight: 18, color: color.inkMuted },
  footer: {
    paddingHorizontal: space.lg + 4,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
    backgroundColor: color.paper,
  },
}));

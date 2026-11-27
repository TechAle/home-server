import {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {useTheme} from '../../../theme';

interface EpisodeActionsProps {
  visible: boolean;
  title: string;
  episode: number;
  onClose: () => void;
  onStream: () => void;
}

export function EpisodeActions({
  visible,
  title,
  episode,
  onClose,
  onStream,
}: EpisodeActionsProps) {
  const theme = useTheme();
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (visible) {
      setNotice('');
    }
  }, [visible]);

  if (!visible) {return null;}

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chiudi"
        onPress={onClose}
        style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(4, 9, 18, 0.55)'}]}
      />

      <Card style={styles.card}>
        <Text style={[styles.eyebrow, {color: theme.colors.accent}]}>
          Episodio {episode}
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.title, {color: theme.colors.ink}]}>
          {title}
        </Text>
        <Text style={[styles.hint, {color: theme.colors.muted}]}>
          Come vuoi guardarlo?
        </Text>

        <Button label="Stream esegui" onPress={onStream} />
        <Button
          label="Scarica ed esegui"
          variant="ghost"
          onPress={() =>
            setNotice('Download in arrivo: per ora usa Stream esegui.')
          }
        />
        {notice ? (
          <Text style={[styles.notice, {color: theme.colors.warn}]}>
            {notice}
          </Text>
        ) : null}

        <Button label="Annulla" variant="ghost" onPress={onClose} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {zIndex: 30, justifyContent: 'center', alignItems: 'center', padding: 20},
  card: {width: '100%', maxWidth: 380, gap: 12},
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {fontSize: 18, fontWeight: '700', letterSpacing: -0.3},
  hint: {fontSize: 13, marginBottom: 2},
  notice: {fontSize: 12, lineHeight: 18},
});

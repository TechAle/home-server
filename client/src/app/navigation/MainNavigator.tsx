import {useState} from 'react';
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {Background} from '../../components/ui/Background';
import {useLogout} from '../../queries/auth';
import {AniListScreen} from '../../screens/anilist/AniListScreen';
import {BackupScreen} from '../../screens/backup/BackupScreen';
import {DashboardScreen} from '../../screens/dashboard/DashboardScreen';
import {FilesScreen} from '../../screens/files/FilesScreen';
import {MediaScreen} from '../../screens/media/MediaScreen';
import {RaspberryScreen} from '../../screens/raspberry/RaspberryScreen';
import {EpisodePlayer} from '../../screens/anilist/components/EpisodePlayer';
import {Drawer} from './Drawer';
import type {MainRoute} from './routes';
import {TopBar} from './TopBar';

export function MainNavigator() {
  const logout = useLogout();
  const [route, setRoute] = useState<MainRoute>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stream, setStream] = useState<{
    title: string;
    url: string;
    mediaId: number;
    progress: number;
    episode: number;
    status: 'CURRENT' | 'PLANNING' | 'REPEATING';
    mode: 'stream' | 'file';
    playUrl?: string;
  } | null>(null);

  const navigate = (next: MainRoute) => {
    setRoute(next);
    setDrawerOpen(false);
  };

  const screen = (() => {
    switch (route) {
      case 'raspberry':
        return <RaspberryScreen />;
      case 'anilist':
        return <AniListScreen onPlay={setStream} />;
      case 'files':
        return <FilesScreen />;
      case 'media':
        return <MediaScreen />;
      case 'backup':
        return <BackupScreen />;
      case 'dashboard':
      default:
        return <DashboardScreen onOpen={navigate} />;
    }
  })();

  return (
    <View style={styles.root}>
      <Background variant="home" />
      <SafeAreaView
        style={[
          styles.safe,
          Platform.OS === 'android' && {
            paddingTop: StatusBar.currentHeight ?? 0,
          },
        ]}>
        <TopBar
          active={route}
          onNavigate={navigate}
          onOpenMenu={() => setDrawerOpen(true)}
          onLogout={() => logout.mutate()}
          loggingOut={logout.isPending}
        />
        <View style={styles.content}>{screen}</View>
        <Drawer
          open={drawerOpen}
          active={route}
          onNavigate={navigate}
          onClose={() => setDrawerOpen(false)}
          onLogout={() => logout.mutate()}
        />
      </SafeAreaView>

      {stream ? (
        <EpisodePlayer
          url={stream.url}
          playUrl={stream.playUrl}
          title={stream.title}
          mediaId={stream.mediaId}
          progress={stream.progress}
          episode={stream.episode}
          status={stream.status}
          onNext={setStream}
          onClose={() => setStream(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  safe: {flex: 1},
  content: {flex: 1},
});

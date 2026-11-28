#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification
{
  self.moduleName = @"Test";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super applicationDidFinishLaunching:notification];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
#ifdef RN_FABRIC_ENABLED
  return true;
#else
  return false;
#endif
}

@end

/**
 * Emits a throttled `mouseMoved` event for the app's windows. The player
 * WebView handles the pointer itself, so a JS `onPointerMove` never reaches
 * React Native; a local NSEvent monitor sees every mouse move instead.
 */
@interface MouseActivity : RCTEventEmitter <RCTBridgeModule>
@end

@implementation MouseActivity {
  id _monitor;
  CFAbsoluteTime _lastEvent;
}

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ @"mouseMoved" ];
}

- (void)startObserving
{
  if (_monitor != nil) {
    return;
  }

  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(appResignedActive:)
                                               name:NSApplicationDidResignActiveNotification
                                             object:nil];
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(appResignedActive:)
                                               name:NSApplicationWillTerminateNotification
                                             object:nil];

  __weak MouseActivity *weakSelf = self;
  _monitor = [NSEvent addLocalMonitorForEventsMatchingMask:NSEventMaskMouseMoved
                                                  handler:^NSEvent *(NSEvent *event) {
    MouseActivity *strongSelf = weakSelf;
    if (strongSelf == nil) {
      return event;
    }

    // ~12 events/s are enough to wake the controls without flooding the bridge.
    CFAbsoluteTime now = CFAbsoluteTimeGetCurrent();
    if (now - strongSelf->_lastEvent >= 0.08) {
      strongSelf->_lastEvent = now;
      [strongSelf sendEventWithName:@"mouseMoved" body:nil];
    }

    return event;
  }];
}

- (void)stopObserving
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];

  if (_monitor != nil) {
    [NSEvent removeMonitor:_monitor];
    _monitor = nil;
  }

  [NSCursor setHiddenUntilMouseMoves:NO];
}

- (void)appResignedActive:(NSNotification *)notification
{
  [NSCursor setHiddenUntilMouseMoves:NO];
}

RCT_EXPORT_METHOD(setCursorHidden:(BOOL)hidden)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    // Hides until the next mouse move; NO restores it immediately.
    [NSCursor setHiddenUntilMouseMoves:hidden];
  });
}

@end

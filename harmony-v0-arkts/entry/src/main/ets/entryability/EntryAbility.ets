import UIAbility from '@ohos.app.ability.UIAbility';
import window from '@ohos.window';

export default class EntryAbility extends UIAbility {
  onCreate(want, launchParam) {
    console.info('[EntryAbility] onCreate');
  }

  onDestroy() {
    console.info('[EntryAbility] onDestroy');
  }

  onForeground() {
    console.info('[EntryAbility] onForeground');
  }

  onBackground() {
    console.info('[EntryAbility] onBackground');
  }

  onWindowStageCreate(windowStage) {
    console.info('[EntryAbility] onWindowStageCreate');
    windowStage.setUIContent(this.context, 'pages/Index');
  }

  onWindowStageDestroy(windowStage) {
    console.info('[EntryAbility] onWindowStageDestroy');
  }
}

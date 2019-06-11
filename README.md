CoryBot
=========

nodejs上で動くmineflayerを利用した適当bot
minecraft 1.12.2 で動作

## Environment
インストール
```
npm install
```

.env.sample をコピーして .env を作成し、環境に合わせて内容を書き換えてください。

```
MC_HOST="localhost"
MC_PORT="25565"
MC_USERNAME="myname@foo.bar"
MC_PASSWORD="passwd"
MC_VERSION="1.12.2"
MC_RADAR_PORT="7000"

MC_LOCAL="false"
MC_LOCAL_HOST="localhost"
MC_LOCAL_PORT="25565"
```

#### その他(makedir)
log, nbt, PlayLists, MineMusicディレクトリを作成してください。
#### その他(radar)
画像を入れてください、詳しくはRadarフォルダ内のREADMEへ

## Functions
### チャット
挨拶,計算,オークション
### 移動
goto, follow, chase, elytra, 押し合い移動, 近くに人に目線追従
### 演奏
jsonファイルの楽譜を音符ブロックで演奏する
### コンバット
弾道計算による直射または曲射, 近づいてきた敵性MOBへの攻撃
### ブラウザ操作
レーダーによる地形とエンティティの表示, チャット表示, 各種コマンドボタン, インベントリ操作
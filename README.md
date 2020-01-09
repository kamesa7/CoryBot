CoryBot
=========

nodejs上で動くmineflayerを利用した適当bot
minecraft 1.13.2 で動作

## Environment
インストール
```
npm install
```

.env.sample をコピーして .env を作成し、環境に合わせて内容を書き換えてください。

```
MC_HOST = "localhost"
MC_PORT = "25565"
MC_USERNAME = "myname@foo.bar"
MC_PASSWORD = "passwd"
MC_VERSION = "1.13.2"
MC_USE_CACHE = true

MC_RADAR = true
MC_RADAR_PORT = "7000"

MC_BOUYOMI = false

MC_LOCAL = false
MC_LOCAL_HOST = "localhost"
MC_LOCAL_PORT = "25565"

MC_VANILLA_CHAT = false
MC_NAMECALL_REGEXP = "MrSteve|MrAlex"
```

## Functions
### チャット(chat)
挨拶,計算,オークション
### 移動(movements)
goto, follow, chase, elytra, 押し合い移動, 近くに人に目線追従
### 演奏(playing music)
jsonファイルの楽譜を音符ブロックで演奏する
### コンバット(combat)
弾道計算による直射または曲射, 近づいてきた敵性MOBへの攻撃
### ブラウザ操作(radar)
レーダーによる地形とエンティティの表示, チャット表示, 各種コマンドボタン, インベントリ操作
# Reactのさまざまなデータフェッチ方法を比較して理解して正しく使用する - useEffect編

昨今のReact・Next.js界隈では様々なデータフェッチの仕組みが提供されていますが、一体どのような場面でどのデータフェッチ方法を使用したらベストなのでしょうか？

開発のためにたくさんの選択肢が出てきた今、きちんとそれぞれの特長を知って正しく適当に使ってあげたいものですね🌟

そこで、
- ☝🏻CSRで基本的な「クライアントサイドデータフェッチ」としてuseEffect hooksを用いたデータフェッチ
- ✌🏻「クライアントサイドデータフェッチ」に加えて「クライアントサイドキャッシュの仕組みを利用して状態管理ができる」ことで有名なデータフェッチライブラリのSWR, TanStack Query
- 🤟🏻「サーバサイドデータフェッチ」として(1)Next.jsでのgetServerSidePropsを利用したデータフェッチ・(2)App Router組み込みのキャッシュ機構とRSCを用いたデータフェッチ

のデータフェッチを比較しながらそれぞれの挙動と特徴を理解して正しく使っていこうというのが今回の試みです。

なお、「Reactのさまざまなデータフェッチ方法を比較して理解して正しく使用する」は全３シリーズで書いています。
この記事では「useEffectを用いたデータフェッチ」について理解していきます。

1. イントロ+useEffectを用いたデータフェッチ ← 👀この記事
2. SWR・TanStack Queryを用いたデータフェッチ
3. Pages Routerでのデータフェッチ+App Routerでのデータフェッチ+まとめ

## Repository
以下は今シリーズで用いたリポジトリです。

🔽クライアントサイドフェッチの調査に用いたリポジトリ：React+Vite（useEffect, SWR・TanStack Query）
https://github.com/saku-1101/caching-swing-csr
🔽サーバーサイドフェッチの調査に用いたリポジトリ：Next.js Pages Router, App Router
https://github.com/saku-1101/caching-swing-pages
https://github.com/saku-1101/caching-swing

## useEffectを用いたクライアントサイドデータフェッチ
今回は、階層のトップレベルで`useEffect`を用いて、ページレンダリング時にデータ取得を行う方法を検証しました。

この方法のメリットは、特に追加のライブラリを要さない且つ理解しやすいというところ。

デメリットとしては次の点が挙げられます。
- propsのバケツリレーが起きてしまうことでコンポーネント間の依存が強くなる
- 各コンポーネントでデータフェッチを行うようにすると無駄なネットワークトランザクションが発生する
- データ取得中や更新中の状態管理(loading, validating, error...)を独自実装する必要がある
- 親でフェッチしたデータを利用して子で別のデータを取得しようとすると、ネットワークのウォーターフォールが発生してしまう

それでは早速、useEffectを用いてデータフェッチする処理を書いてみましょう。

### useEffectを用いたデータフェッチの調査
https://github.com/saku-1101/caching-swing-csr/blob/a9b407e62e9f47138fd4add7e9e007f3724f3ad7/src/effect-fetch/index.tsx#L10-L65

`useEffect`の依存配列を空にして、`useEffect`の発火が何にも依存しない・比較されない状態、つまり初期レンダリングの時にしか発火されない状態にし、第一引数内でデータフェッチ処理を行います。
データは`useState`のset関数によってstateに保持されます。
そのstateをデータが必要な各々のコンポーネントに`props`として渡していきます。
また、値更新処理に必要なハンドラも`form`を含むPersonコンポーネントに渡します。

Personコンポーネントでユーザ名の更新をしてみましょう。
https://github.com/saku-1101/caching-swing-csr/blob/a9b407e62e9f47138fd4add7e9e007f3724f3ad7/src/effect-fetch/index.tsx#L32-L50

`body`に`form`からのデータを付与したPOSTリクエストを`/api/update/user`に送ると、DBの値が更新されます。

更新した値をUIに反映していきます。
https://github.com/saku-1101/caching-swing-csr/blob/a9b407e62e9f47138fd4add7e9e007f3724f3ad7/src/effect-fetch/index.tsx#L49
ここで現在のデータ取得できる条件を思い出すと、**初期レンダリング時**でした。
そのため、ここではset関数を使用して再レンダリングをトリガーすることで、最新のデータをUIに反映させます。

### 結果
データ取得・更新のたびにすべてのデータが新しくフェッチされ、今回の実装では全てのコンポーネントの再レンダリングも起こります。

![](https://storage.googleapis.com/zenn-user-upload/f1c37e1c6db0-20231119.gif)
*useEffect fetch in CSR*

***

完全に余談ですが、以下はApp Routerで同様にuseEffectを用いて階層のトップレベルでデータをフェッチし、更新した場合の挙動です。

動画ではuserのみ（更新処理を行なった部分のみ）の更新リクエストが発生していますが、これはで[後に](https://zenn.dev/cybozu_frontend/articles/21a924a294d869)触れるApp Routerのキャッシュ機能によるものです。

![useEffect fetch with App Router](https://storage.googleapis.com/zenn-user-upload/2e49fbd2b529-20231117.gif)
*useEffect fetch with App Router*

App RouterでuseEffectを使用した場合のコード例は以下のようになります。
https://github.com/saku-1101/caching-swing/blob/85aa6baca8ec4ef5f7148a5c57f4e6a5d0072877/src/app/legacy-fetch/children/user.tsx#L12-L27
:::message
set関数がreloadや、のちに[SWRやTanStackの記事](https://zenn.dev/cybozu_frontend/articles/a735baacc09c6a)で説明する`mutate`の役割を担っているイメージです。
:::

このように、React + Viteの時とApp Routerの時でどちらも
1. `body`に`form`からのデータを付与したPOSTリクエストを`/api/update/user`に送る
2. set関数を用いて再レンダリングをトリガーし、最新の状態をUIに反映する
という実装を行いました。

しかし、リクエストの挙動としてはReact + Viteの場合はユーザ名を更新すると更新のリクエストと全てのデータ取得のリクエストが送信されていたのに対し、
App Routerの時では更新のリクエストしか送信されていないことがわかります。

### リクエストの重複
![](https://storage.googleapis.com/zenn-user-upload/88c95335b24a-20231119.png)
*fetch with useEffect*

今回はトップの親コンポーネントで`useEffect`を使用して、意図的にリクエストを親にまとめ、データを子コンポーネントに`props`として配布するという形にしています。

Personコンポーネントでデータの更新後に`window.location.reload();`でリロードをかけて再レンダリングを行い、親のuseEffect内の処理をもう一度行なっているのでネットワークトランザクションは合計**3回**です。

しかし、もしそれぞれの子コンポーネントで`useEffect`を使用してそれぞれのレンダリング時にデータを取得するような書き方をするとなると、別コンポーネントでのデータ取得は別物とみなされ、多くのトランザクションが発生することになります...

加えて、もし親コンポーネントをレンダーして、それが何かデータをフェッチし、そのあとに子コンポーネントをレンダーし、今度はそれが何かデータのフェッチを開始するといった状況が発生するとなると、逐次的に非同期処理が実行されますので、ネットワークのウォーターフォールが発生し、ネットワークが遅い環境などではパフォーマンスに著しい影響を与えることが予想されます...

***

今回の記事ではuseEffectを使用したデータフェッチについて、改めて理解していきました。

Reactでデータをフェッチする手段としては有名なuseEffectなので、正しく理解して使い所を考えたいですね💪🏻❤️‍🔥

同じく、クライアントサイドでデータをフェッチする方法として有名なSWR・TanStack Queryについては[次の記事](https://zenn.dev/cybozu_frontend/articles/a735baacc09c6a)で理解を深めていきます。

useEffectと比較してどうなのか、一緒に考えながら読んでいただけると幸いです✉️
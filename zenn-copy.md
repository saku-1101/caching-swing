昨今のReact・Next.js界隈では様々なデータフェッチの仕組みが提供されていますが、一体どのような場面でどのデータフェッチ方法を使用したらベストなのでしょうか？

開発のためにたくさんの選択肢が出てきた今、きちんとそれぞれの特長を知って正しくフルに使ってあげたいものです。

そこで、従来よくやっていたuseEffect hooksを用いたデータフェッチ、「クライアントサイドキャッシュの仕組みを利用して状態管理ができる」ことで有名なデータフェッチライブラリのSWR, TanStack Query、そしてNext.jsでのRSCを用いたデータフェッチ・App Router組み込みのキャッシュ機構を比較しながらそれぞれの挙動と特徴を理解して正しく使っていこうというのが今回の試みです。

調査過程を含む長文になりますので、蛇足な方は以下から今回の結果をご覧ください。
[結果](https://zenn.dev/articles/ca4caef5684cee#結果)

## Repository
以下は今回調査するにあたって用いたリポジトリです。
https://github.com/saku-1101/caching-swing
https://github.com/saku-1101/caching-swing-pages

## useEffectを用いたデータフェッチ
今回は、階層のトップレベルで`useEffect`を用いて、ページレンダリング時にデータ取得を行う方法を検証しました。

この方法のメリットは、特に追加のライブラリを要さない且つ理解しやすいというところ。
デメリットとしては次の点が挙げられます。

- propsのバケツリレーが起きてしまうことでコンポーネント間の依存が強くなる
- 各コンポーネントでデータフェッチを行うようにすると無駄なネットワークトランザクションが発生する
- データ取得中や更新中の状態管理(loading, validating, error...)がSWRやTanStack Queryを用いた時のように細かく行えない

### useEffectを用いたデータフェッチの調査
https://github.com/saku-1101/caching-swing/blob/85aa6baca8ec4ef5f7148a5c57f4e6a5d0072877/src/app/legacy-fetch/page.tsx#L15-L46

`useEffect`の依存配列を空にして、`useEffect`の発火が何にも依存しない・比較されない状態、つまり初期レンダリングの時にしか発火されない状態にし、第一引数内でデータフェッチ処理を行います。
データは`useState`のset関数によってstateに保持されます。
そのstateをデータが必要な各々のコンポーネントに`props`として渡していきます。
(※ここでPersonコンポーネントに渡している`setter props`が後から重要な役割を担います)

子コンポーネントでユーザ名の更新をしてみましょう。
(ここでは極力Next.js v14の機能を使わないことを前提として話を進めていくので、Server Actionsは使用しません。)
https://github.com/saku-1101/caching-swing/blob/04538a768ad3cb5a7cc9098447c1ac6f32505d35/src/app/legacy-fetch/children/user.tsx#L13-L22

`body`に`form`からのデータを付与したPOSTリクエストを`/api/update/user`に送ると、prismaを通してlocal postgres DBの値が更新されます。

更新した値をUIに反映していきます。
https://github.com/saku-1101/caching-swing/blob/04538a768ad3cb5a7cc9098447c1ac6f32505d35/src/app/legacy-fetch/children/user.tsx#L24-L27
ここで現在のデータ取得できる条件を思い出すと、**初期レンダリング時**でした。
`router.reload()`をして再レンダリングをトリガーすることで、最新のデータがUIに反映されます。

### 結果
データ取得・更新のたびにすべてのデータが新しくフェッチされ、現状の実装では全てのコンポーネントの再レンダリングも起こります。

![](https://storage.googleapis.com/zenn-user-upload/2dc5d1bde994-20231116.gif)
*useEffect fetch with Pages Router*


余談ですが、App Routerで同様にuseEffectを用いて階層のトップレベルでデータをフェッチし、更新した場合の挙動です。

動画ではuserのみ（更新処理を行なった部分のみ）の更新リクエストが発生していますが、これはApp Routerのキャッシュ機能によるものです。

![](https://storage.googleapis.com/zenn-user-upload/6d9c9abeb651-20231116.gif)
*useEffect fetch with App Router*
::message
Pages Routerでは`next/router`から`useRouter`がインポートされていました。
しかし、App Routerでは`useRouter`は`next/navigation`からのインポートとなり、仕様も異なります。
App Routerでは`router.reload()`のように内部的に`window.location.reload()`をコールするようなメソッドは提供されていません。
そこで、先ほど`props`として渡しておいた`useState`のset関数を子コンポーネントから呼び出すことによって親要素レベルからの再レンダリングを行っています。

set関数がのちに説明する`mutate`の役割のようになっているイメージです。
::

### リクエストの重複
![useEffectを用いたデータフェッチ](https://storage.googleapis.com/zenn-user-upload/d5951d63eff3-20231116.png)
*fetch with useEffect*

今回はトップの親コンポーネントで`useEffect`を使用して、意図的にリクエストを親にまとめ、データを子コンポーネントに`props`として配布するという形にしています。

Personコンポーネントでデータの更新後に`router.reload()`でリロードをかけて再レンダリングを行い、親のuseEffect内の処理をもう一度行なっているのでネットワークトランザクションは合計3回です。

しかし、もしそれぞれの子コンポーネントでuseEffectを使用してそれぞれのレンダリング時にデータを取得するような書き方をするとなると、別コンポーネントでのデータ取得は別物とみなされ、多くのトランザクションが発生することになります...

## SWRを用いたデータフェッチ
次に、SWRを用いてデータのフェッチ・更新を行うときの挙動を確認していきます。

SWRのようなサードパーティ製のデータフェッチライブラリを使うことのメリットとして
- propsのバケツリレーを起こさずに、コンポーネント各々がオーナーシップを持ってデータを扱える点
- 個々のコンポーネントがデータフェッチの処理を含んでいても、無駄なネットワークトランザクションが発生しない点
- レスポンスのキャッシュが行える点
- 直感的に更新後の状態をUIに反映できる点
- データ取得中や更新中の状態管理をしやすいのでユーザに細かく正確なフィードバックを送ることができ、UXを高められる点

などが挙げられます。

そのほかにもたくさんのメリットが紹介されています。
[SWR](https://swr.vercel.app/ja)

### SWRを用いたデータフェッチの調査方法
useEffectを使ったデータフェッチに比べて、ここではデータ取得を行っておらず、各コンポーネントも`props`を持っていません。
その代わりに、データ取得のための`hooks`をいくつか追加しました。
https://github.com/saku-1101/caching-swing/tree/main/src/app/prc-swr/hooks
![](https://storage.googleapis.com/zenn-user-upload/70ee47882896-20231116.png)
*/src/app/prc-swr/hooks*
これらのhooksをそのデータが必要な各コンポーネントで呼び出してもらうことで、必要なデータ取得の責務を各コンポーネントが持つことができ、コンポーネント同士が`props`で密に接合された状態になることを防ぎます。

https://github.com/saku-1101/caching-swing/blob/04538a768ad3cb5a7cc9098447c1ac6f32505d35/src/app/prc-swr/hooks/useGithub.ts#L5-L11
さらに、`error`や`loading`, `validating`(再検証中)などのデータ取得の際に起こる状態を返してくれるので、より細かで正確なフィードバックを行うことができます。

Personコンポーネントでユーザ名を更新してみましょう。
https://github.com/saku-1101/caching-swing/blob/04538a768ad3cb5a7cc9098447c1ac6f32505d35/src/app/prc-swr/children/user.tsx#L8-L19
DB更新処理までは先ほどと同様、APIに`POST`リクエストを送信しているだけです。

SWRではデータ更新の際に`mutate`メソッドを使用することで、第一引数に渡されたキーと同様のキーを持つリソースに対して再検証を発行 (データを期限切れとしてマークして再フェッチを発行する) できます。
ここでは`/api/get/user`をキーとして持つリソース、つまり`useGetUser`内部で使用している`useSWR`に「そのデータ古いですよー」と伝えて再フェッチを促します。

すると、`validation`がトリガーされ、最新のデータがフェッチされてUIに反映されます。
![](https://storage.googleapis.com/zenn-user-upload/a56c4f8b9b1d-20231116.gif)
*UIが最新のデータで更新されている様子*

### 結果
先ほどのデータ更新時の再レンダリング範囲注目してみます。すると、以下のように`useGetUser`を使用しているコンポーネントでのみ再レンダリングが発火していることがわかります。
![](https://storage.googleapis.com/zenn-user-upload/25124dde8481-20231116.gif)
*SWRを使うと限定的な範囲で再レンダリングができる*

また、ほかにもSWRにはデータを最新に保つ仕組みがいくつか備わっています。その一部を見てみましょう。

#### Revalidate on Focus
`window`にフォーカスが当たった場合に自動的に再検証が走り、最新のデータがフェッチされ、再レンダリングされます。
![](https://storage.googleapis.com/zenn-user-upload/8dfcf5603698-20231116.gif)
*SWR: Revalidate on Focus*

#### Revalidate on Interval
`window`にフォーカスを当てずとも、ポーリング間隔を指定することで、一定の間隔で再検証を走らせてデータ更新を行うことができます。
異なるデバイス間で定期的にデータ同期を行う際に便利です。
```diff:js useGetUser.ts
import useSWR from "swr";
import { fetcher } from "./fetcher";

export const useGetUser = () => {
  const url = "/api/get/user";
- const { data, error, isLoading, isValidating } = useSWR(url, fetcher);
+ const { data, error, isLoading, isValidating } = useSWR(url, fetcher, { refreshInterval: 1000 });
  return {
    user: data,
    userError: error,
    userIsLoading: isLoading,
    userIsValidating: isValidating,
  };
};

```
![](https://storage.googleapis.com/zenn-user-upload/c0e656740d7a-20231116.gif)
*SWR: Revalidate on Interval*

### リクエストの重複
SWRには重複排除の仕組みが備わっています。

この例では、各コンポーネントにデータ取得の責務を結びつけるために、内部で`useSWR`を用いたカスタムhooksをコンポーネント内で呼び出していました。

これにより、ユーザ情報を必要とするPersonコンポーネントとHeaderコンポーネントそれぞれで`useGetUser` hookをコールすることになるのですが、ネットワークトランザクションが2回起こることにならないのでしょうか？😶

`useSWR`では同じキーを持ち、ほぼ同時期にレンダリングされるコンポーネントに関しては、リクエストは一つにまとめられます。
![swrリクエストの重複](https://storage.googleapis.com/zenn-user-upload/8d261ba9c7db-20231116.png)
*SWRを使うと重複したリクエストは排除される*

この重複排除の仕組みのおかげで、ネットワークトランザクション回数によるパフォーマンスの問題を気にせずにアプリ内でバシバシSWRフックを再利用することができます💪🏻❤️‍🔥

## TanStack Queryを用いたデータフェッチ
TanStack QueryもSWRと同様クライアントサイドキャッシュを利用したデータフェッチが行えるライブラリです。
バンドルサイズはSWRの３倍ほどありますが、SWRよりも高機能です。

そんなTanStack Queryを用いてデータのフェッチ・更新を行うときの挙動も確認していきます。

[TanStack Query](https://tanstack.com/query/latest)

### TanStack Queryを用いたデータフェッチの調査
https://github.com/saku-1101/caching-swing/blob/85aa6baca8ec4ef5f7148a5c57f4e6a5d0072877/src/app/prc-tanstack/page.tsx#L10-L29
TanStack Queryは内部的に`useContext`や`useEffect`などを使用しているため、TanStack Queryを使用するコンポーネントをまるっと`QueryClientProvider`でラップします。

`QueryClientProvider`は`new`した`QueryClient`インスタンスと接続し、インスタンスを内部のコンポーネントに提供して使用できるようにしてくれます。
(ここでは一旦`broadcastQueryClient`の存在は無視してください)

TanStack QueryでもSWRと同様、カスタムhooksを用いてデータ取得を各々のコンポーネントで行うため、propsのバケツリレーを防ぐことができていていいですね!

⭐️SWRと比較のためフェッチのための処理の説明を追加する

Personコンポーネントでユーザ名を更新してみます。
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-tanstack/hooks/useMutateUser.ts
https://github.com/saku-1101/caching-swing/blob/85aa6baca8ec4ef5f7148a5c57f4e6a5d0072877/src/app/prc-tanstack/children/user.tsx#L7-L16
TanStack Queryでは更新処理専用の`useMutation` hooksが存在し、その`hooks`が更新・更新時の状態を管理します。

`useMutation` hooksに注目してほしいのですが、これが存在することにより、TanStack Queryでは`mutation`という処理を行っているときの状態が管理できます。

つまり、`mutate`が使われたとき＝**データ更新処理が発火したときから**`isPending`という状態を受け取ることができます。

そして、データ更新が正常に行われると、`onSuccess`でその状態を受け取り、`queryClient.invalidateQueries({ queryKey: ["/api/get/user"] });`にて`/api/get/user`をキーにもつリソースの再検証を発行します。

再検証を発行されたリソース（ここではTanStack Queryの`useGetUser`）はデータの再フェッチを行い、そのときの状態は`useGetUser`の内部で用いられている`useQuery`から`isFetching`として受け取ることができます。

⭐️まとめると、TanStack QueryでuseMutationを用いたときのデータ更新処理は
1. `mutate`でデータ更新をトリガーする
2. データ更新がトリガーされたら`isPending`を返す（Updating...表示）
3. データ更新が完了したら`onSuccess`が状態を受け取り、キーを持つリソースの再検証を発行する(`useGetUser`にデータが古いことを伝えてリフェッチを促す)（Updating...非表示）
4. `useGetUser`が再検証を開始するとともに`isFetching`を返す（⏳loading...表示）
5. `useGetUser`内の`useQuery`の`queryFn`の処理でデータの再フェッチを行う（⏳loading...表示）
6. `queryFn`の処理が完了する（⏳loading...非表示）
![](https://storage.googleapis.com/zenn-user-upload/9be6ad2bb790-20231116.gif)
*TanStack Queryでのデータ更新時の状態管理*

⭐️SWRを用いたときのデータ更新処理は
1. `fetch`関数が呼び出されてデータ更新が行われる
2. データ更新が完了する
3. `mutate`(key)でキーを持つリソースの再検証を発行する(`useGetUser`にデータが古いことを伝えてリフェッチを促す)
4. `useGetUser`が再検証を開始するとともに`isValidating`を返す（⏳loading...表示）
5. `useGetUser`内の`useSWR`の第二引数の処理でデータの再フェッチを行う（⏳loading...表示）
6. 5の処理が完了する（⏳loading...非表示）
![](https://storage.googleapis.com/zenn-user-upload/77d80b781381-20231116.gif)
*SWRでのデータ更新時の状態管理*

となり、DB update処理中（API内部処理実行中）の状態を、TanStack Queryはwatchできるのに対し、SWRではその機能は提供されていないということになります。

### 結果
上記の動画より、TanStack QueryもSWRの時ように`useGetUser`を使用しているコンポーネントでのみ再レンダリングが発火していることがわかります。TanStack Queryもキーによってデータの取得・更新処理を行うか否かを管理しているからです。

また、TanStack Queryにもデータを最新に保つ仕組みが備わっています。Window Focus RefetchingについてSWRと比較して見てみましょう。

#### Window Focus Refetching
v4までは`window`にフォーカスが当たった場合に自動的に再検証が走り、最新のデータに書きかわる、SWR同等の仕様でした。

しかし、こちらの[PR](https://github.com/TanStack/query/pull/4805)により`focus`イベントで再検証が走ることのデメリットが議論された結果、v5からは`focus`イベントではなく`visibilitychange`によって自動的再検証が走るような仕様になっているようです。

![](https://storage.googleapis.com/zenn-user-upload/bf7fe92de8a0-20231116.gif)
*現状focusで再検証が走るSWR - devtoolから戻ってきた時や、windowがクリックされたとき、別ディスプレイに行って戻ってきた時にも再検証が走る*

![](https://storage.googleapis.com/zenn-user-upload/62696d85c3ed-20231116.gif)
*visibilitychangeで再検証が走るTanStack Query*

`focus`で再検証が走ることはSWRでも議論されており、[PR](https://github.com/vercel/swr/pull/2672)も出ているので、将来的にはmergeされてTanStack Queryの仕様に近づくのだと思います。🏗️

### リクエストの重複
こちらもSWR同様、リクエストをキーで管理しているので重複が排除されます。
![tanstackリクエストの重複](https://storage.googleapis.com/zenn-user-upload/169e1a2cb75b-20231116.png)
*TanStack Queryを使うと重複したリクエストは排除される*

## App Router cache
最後に、Next.js App Routerのキャッシュ機構を用いたデータフェッチと再検証を見ていきます。

### App Routerでのデータフェッチの調査
RSC(React Server Component)を使用します。

（e.g.; header.tsx）
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/children/header.tsx
`form`を含む葉のPersonコンポーネント(Client Component)以外をRSCとして、それぞれコンポーネント内で`fetch`関数を直接呼び出してデータの取得を行います。

https://github.com/saku-1101/caching-swing/blob/6bba6e5f662018c0cc3bdb68fb58c09e9b3de3f5/src/app/prc-fetch/page.tsx#L8-L24
`loading`に関しては、React18からstableで提供され始めた`Suspense`を用いることでコンポーネントの`Promise`をキャッチして`fallback`の内容を返すことができます。
Next.js v13以降でページレベルで`loading`を制御したい場合は`loading.jsx/tsx`を`page.jsx/tsx`と同階層に置くことで対応できます。
(※上記のRSCでは`Suspense`の動作を確認するために、意図的にsleep関数を仕込んでいました)


また、`error bounday`に関しては、Reactからは`Suspense`のようにfunction componentとして提供されているものはないようです。
コンポーネントごとにエラーの出し分けをしたい場合は、[公式](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)にもあるように、現状[react-error-boundary](https://github.com/bvaughn/react-error-boundary)を使うとよさそうです。
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/error.tsx
もしNext.js v13以降でページレベルで`error`を制御したい場合は、**Client Componentとして**`error.jsx/tsx`を`loading`と同様`page.jsx/tsx`と同階層に置くことで対応できます。


それでは、Personコンポーネント内のformを用いてユーザ名を更新してみましょう。
ここでは`Server Actions`を用いて更新処理を行います。(調査環境: Next.js v14.0.2)
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/actions/handleUpdateUserName.ts
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/children/user.tsx
`Server Actions`の細かな説明は割愛しますが、`/app/api`内部でしていた処理と同等の処理を行っています。`Server Actions`からORMを介して直接DBを更新する処理です。

ここで注目したいのが`revalidateTag("user");`の部分です。
https://github.com/saku-1101/caching-swing/blob/6bba6e5f662018c0cc3bdb68fb58c09e9b3de3f5/src/app/prc-fetch/actions/handleUpdateUserName.ts#L14
https://github.com/saku-1101/caching-swing/blob/6bba6e5f662018c0cc3bdb68fb58c09e9b3de3f5/src/app/prc-fetch/children/form-output.tsx#L6-L9
`fetch`の際のoptionとして`{ next: { tags: [tag] } }`が渡されたものに関しては、これがデータの再検証の際のキャッシュのタグとして紐付けられます。
`Server Actions`でデータ更新後に`revalidateTag(tag);`を行うとNext.js組み込みのData Cacheストレージからそのタグに紐づけられたキャッシュが再検証されて最新のデータに置き換わります。

### 結果
RSCのfetchを用いた時のデータ取得・更新の挙動です。
![](https://storage.googleapis.com/zenn-user-upload/222f91481c64-20231116.gif)
*RSC, App Routerでのデータ取得*

### リクエストの重複
#### Network Memorization
Reactには[Network Memorization](https://nextjs.org/docs/app/building-your-application/caching#request-memoization)という機能が備わっており、`fetch`を用いたリクエストをメモ化し、キャッシュサーバへのリクエストの重複を排除してくれます。SWRやTanStack Queryで内部的に用いたれていた`Context Provider`の仕組みがキャッシュによって実現されているイメージです。

しかし、リクエスト結果のキャッシュがインメモリのData Cacheストレージに残っており、それを再利用する場合は、ネットワークトランザクションさえ起こりません。
![rscリクエストの重複](https://storage.googleapis.com/zenn-user-upload/59b68b7a218b-20231116.png)
*インメモリキャッシュのおかげでいちいちData Sourceにアクセスしないため、Networkタブに何も表示されない*

## 結果
以上の調査をまとめた結果です。
##### 結局いつどれ使ったらいいの
|  | App Router Cache | SWR | TanStack Query | useEffect |
| ---- | ---- | ---- | ---- | ---- |
| App Routerを使用している時 | RSCで⭕️ | RCCで⭕️  | RCCで⭕️ | 🔼 |
| それ以外| ❌ | ⭕️ | ⭕️ | 🔼 |

* RSC: React Server Component
* RCC: React Client Component
* 🔼: それ以外のアプローチが使えない場合に最終手段として使用
* ❌: 使えない

##### それぞれの特徴まとめ
|  | App Router Cache | SWR | TanStack Query | useEffect |
| ---- | ---- | ---- | ---- | ---- |
| フェッチ方法 | コンポーネント単位でのデータフェッチ/子コンポーネント単位でのレンダリング | コンポーネント単位でのデータフェッチ/子コンポーネント単位でのレンダリング  | コンポーネント単位でのデータフェッチ/子コンポーネント単位でのレンダリング | コンポーネント単位でのデータフェッチは基本的に行わない/useEffectを使用しているすべてのコンポーネントで起こる |
| キャッシュ | ⭕️ | ⭕️ | ⭕️ | ❌ |
| 状態表示(loading, 再検証など) | 🔼 | ⭕️ | ⭕️ | ❌ |
| リクエスト重複排除 | ⭕️ | ⭕️ | ⭕️ | ❌ |
* ⭕️: できる
* 🔼: できるが他に劣る
* ❌: できない

## まとめ
自分の中で挙動や理解がまとまっていなかった、Reactにおけるさまざまなデータフェッチ・管理方法を浅く広くまとめることができて良い機会だったと思います。

まとめると、
1. Next.jsなどのフレームワークを使用している場合は、組み込みのデータフェッチを利用する
2. フレームワークを利用しない場合はSWRやTanStack Queryなど、クライアントサイドキャッシュの利用を検討する
3. それ以外の場合・どちらも使えない場合はuseEffectで直接データフェッチをする

となり、useEffectの出番は稀になりそうです。

それぞれのデータフェッチ方法の個性を活かしつつ、敵最適所で使っていきたいとおもいます！
OSSいつもありがとう！🙌🏻

## 余談 - (TanStack Query)broadcastQueryClientという実験的な機能
TanStack Queryが`window`にフォーカスが当たった時ではなく`visibilitychange`によってデータの再検証を行う方向になったお話を先ほどしました。

以前TanStack Queryを使用した時は、`window`フォーカスで再検証が行われていたため、今回の調査の時に`window`を二つ開いて一つの`window`でデータを更新した時、もう一つの`window`に戻ってデータが更新されないことに（？）となり、Q&Aを投げてみました。

https://github.com/TanStack/query/discussions/6364

結果、私の確認不足ということで、`v5`から上記の挙動に変わっていました。
しかし、今は`broadcastQueryClient`でアプリレベルで`connection`を張って変更を検知できるようにしている機能を開発してるよという回答をいただき、詳細な仕組みは理解できていませんが、それも試してみました。(実はこれもexperimentalとしてlatestのdocumentには明記されている)
```diff:js page.tsx
"use client";
+import { broadcastQueryClient } from "@tanstack/query-broadcast-client-experimental";
import { QueryClient, QueryClientProvider } from "@tanstack/TanStack Query";
import BackButton from "../_component/back-button";
import LinkButton from "../_component/link-button";
import Content from "./children/content";
import Header from "./children/header";
import { Person } from "./children/user";

export default function TanstackPage() {
	const queryClient = new QueryClient();
+	broadcastQueryClient({
+		queryClient,
+		broadcastChannel: "tanstack-app",
+	});
	return (
		<QueryClientProvider client={queryClient}>
			<div>
				<Header />
				<Content />
				<Person />
				<BackButton />
				<LinkButton link="/prc-swr" label="swr" />
				<LinkButton link="/prc-fetch" label="fetch" />
				<LinkButton link="/legacy-fetch" label="legacy" />
			</div>
		</QueryClientProvider>
	);
}

```
![](https://storage.googleapis.com/zenn-user-upload/dbdfa5411272-20231116.gif)
*片方のwindowで更新をかけると、同期的にもう片方のwindowでも値が変更される*

動作環境：
"@tanstack/query-broadcast-client-experimental": "5.8.3"
"@tanstack/TanStack Query": "5.8.3"
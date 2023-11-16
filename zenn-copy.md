 昨今のReact界隈では様々なデータフェッチの仕組みが提供されています。

そこで、従来よくやっていたuseEffect hooksを用いたデータフェッチ、「クライアントサイドキャッシュの仕組みを利用して状態管理ができる」ことで有名なデータフェッチライブラリのSWR, TanStack Query、そしてNext.jsでのRSCを用いたデータフェッチ・App Router組み込みのキャッシュ機構を比較しながらそれぞれの挙動と特徴を理解して正しく使っていこうというのが今回の試みです。

## Repository
以下は今回調査するにあたって用いたリポジトリです。
https://github.com/saku-1101/caching-swing

## useEffectを用いたデータフェッチ
階層のトップレベルでuseEffectを用いて、ページレンダリング時にデータ取得を行うやり方です。

この方法のメリットは、特に追加のライブラリを要さない且つ理解しやすいというところ。
デメリットとしては、propsのバケツリレーが起きてしまうことでコンポーネント間の依存が強くなる点、それを避けるために各コンポーネントでデータフェッチを行うようにすると無駄なネットワークトランザクションが発生する点、next/routerが使えない環境では直感的なUI更新が行えない点、データ取得中や更新中の状態管理(loading, validating, error...)などがswrやreact queryを用いた時のように細かく行えない点などが挙げられます。

### 実験
階層のトップレベルでuseEffectを用いてデータフェッチを行うので、App Routerでは'use client'ディレクティブを付与します。

useEffectの依存配列を空にして、useEffectの発火が何にも依存しない・比較されない状態、つまり初期レンダリングの時にしか発火されない状態にし、第一引数内でデータフェッチ処理を行います。
データはuseState hooksのset関数によってstateに保持されます。
そのstateをデータが必要な各々のコンポーネントにpropsとして渡していきます。
(※ここでPersonコンポーネントに渡しているset propsが後から重要な役割を担います)

子コンポーネントでユーザ名の更新をしてみましょう。
(ここでは極力Next.js v14の機能を使わないことを前提として話を進めていくので、Server Actionsは使用しません。)
bodyにformからのデータを付与したPOSTリクエストを/api/update/userに送ると、prismaを通してlocal postgres DBの値が更新されます。

https://github.com/saku-1101/caching-swing/blob/04538a768ad3cb5a7cc9098447c1ac6f32505d35/src/app/legacy-fetch/children/user.tsx#L13-L22

更新した値をUIに反映していきます。
ここで現在のデータ取得できる条件を思い出すと、**初期レンダリング時**でした。
Pages Routerの時はrouter.reload()をして再レンダリングを直感的にトリガーしていた人が多いかもしれません。
Pages Routerではnext/routerからuseRouterがインポートされていましたが、App RouterではuseRouterはnext/navigationからのインポートとなり、仕様も異なります。router.reload()のように内部的に`window.location.reload()`をコールするようなメソッドは提供されていません。
そこで、先ほどpropsとして渡しておいたuseStateのset関数を子コンポーネントから呼び出すことによって親要素レベルからの再レンダリングを行います。
https://github.com/saku-1101/caching-swing/blob/04538a768ad3cb5a7cc9098447c1ac6f32505d35/src/app/legacy-fetch/children/user.tsx#L24-L27

こうすることでレンダリングがトリガーされ、更新後の状態がUIに反映されます。

set関数がのちに説明するmutateの役割のようになっているイメージです。

### 挙動
データ取得・更新のたびに新しくデータがフェッチされ、現状の実装では全てのコンポーネントの再レンダリングも起こります。
:::message
動画ではuserのみの更新リクエストが発生していますが、これはApp Routerのキャッシュ機能によるもので、Pages Routerで同等のデータフェッチをした場合はuseEffect内のデータフェッチが全て行われます
:::

![](https://storage.googleapis.com/zenn-user-upload/6d9c9abeb651-20231116.gif)
*useEffect fetch with App Router*

![](https://storage.googleapis.com/zenn-user-upload/2dc5d1bde994-20231116.gif)
*useEffect fetch with Pages Router*


### リクエストの重複
![useEffectを用いたデータフェッチ](https://storage.googleapis.com/zenn-user-upload/d5951d63eff3-20231116.png)
:::message
計6回のトランザクションが発生していますが、半分はStrict modeによるものですので、本番環境の呼び出しは3回です。
:::
今回はトップの親コンポーネントでuseEffectを使用して、意図的にリクエストを親にまとめてデータを子コンポーネントにpropsとして配布するという形にしていますが、もしそれぞれの子コンポーネントでuseEffectを使用してそれぞれのレンダリング時にデータを取得するような書き方をすると、別コンポーネントでのデータ取得は別物とみなされるため、多くのトランザクションが発生することになります。

## SWR, TanStack Query
次に、SWR, TanStack Queryを用いてデータのフェッチ・更新を行うときの挙動をそれぞれ確認していきます。

SWRはTanStack Queryと比較してバンドルサイズが小さく軽量なライブラリでできることもシンプル。TanStack QueryはSWRと比較して多機能です。
SWRやTanStack Queryのようなサードパーティ製のデータフェッチライブラリを使うことのメリットは、propsのバケツリレーを起こさずに、コンポーネント各々がオーナーシップを持ってデータを扱える点、それでいて無駄なネットワークトランザクションが発生しない点、直感的に更新後の状態をUIに反映できる点、データ取得中や更新中の状態管理をしやすいのでユーザに細かく正確なフィードバックを送ることができ、UXを高められる点などが挙げられます。

そのほかにもたくさんのメリットが紹介されています。
[SWR](https://swr.vercel.app/ja)
[TanStack Query](https://tanstack.com/query/latest)

デメリットとしては、これらも内部的にはuseContextやuse(experimental)などのclient hooksを使用してContext Providerとして状態を管理することでキャッシュとして扱っているので、現時点でもRSCとの相性はvery goodでは無いという印象なことです。

### SWR
SWRの挙動から確認していきます。

#### 実験
SWRを使用するために、先ほどと同様、階層最上位のコンポーネントに'use client'ディレクティブを付与しています。

しかし、ここではデータ取得を行っておらず、各コンポーネントもpropsを持っていません。
その代わりに、データ取得のためのhooksをいくつか追加しました。
https://github.com/saku-1101/caching-swing/tree/main/src/app/prc-swr/hooks
![](https://storage.googleapis.com/zenn-user-upload/70ee47882896-20231116.png)
*/src/app/prc-swr/hooks*

これらのhooksをそのデータが必要な各コンポーネントで呼び出してもらうことで、必要なデータ取得の責務を各コンポーネントが持つことができ、コンポーネント同士がpropsで接合された状態になることを防ぎます。

さらに、errorやloading, validating(再検証中)などのデータ取得の際に起こる状態を返してくれるので、より細かで正確なフィードバックを行うことができます。
https://github.com/saku-1101/caching-swing/blob/04538a768ad3cb5a7cc9098447c1ac6f32505d35/src/app/prc-swr/hooks/useGithub.ts#L5-L11

Personコンポーネントでユーザ名を更新してみましょう。
ライブラリの機能を使用することでデータ更新を実現したいので、ここでもServer Actionsの使用は割愛します。
DB更新処理までは先ほどと同様、APIにPOSTリクエストを送信しているだけです。
https://github.com/saku-1101/caching-swing/blob/04538a768ad3cb5a7cc9098447c1ac6f32505d35/src/app/prc-swr/children/user.tsx#L8-L19

SWRではデータ更新の際にmutateメソッドを使用することで、第一引数に渡されたキーと同様のキーを持つリソースに対して再検証を発行 (データを期限切れとしてマークして再フェッチを発行する) できます。
ここでは`/api/get/user`をキーとして持つリソース、つまり`useGetUser`内部で使用しているuseSWRに「そのデータ古いですよー」と伝えて再フェッチを促します。

すると、validationが起こり、最新のデータがフェッチされてUIに反映されます。
![](https://storage.googleapis.com/zenn-user-upload/a56c4f8b9b1d-20231116.gif)

#### 挙動
先ほどのデータ更新時の再レンダリング範囲注目してみます。すると、以下のように`useGetUser`を使用しているコンポーネントでのみ再レンダリングが発火していることがわかります。
![](https://storage.googleapis.com/zenn-user-upload/25124dde8481-20231116.gif)

また、ほかにもSWRにはデータを最新に保つ仕組みがいくつか備わっています。その一部を見てみましょう。

##### Revalidate on Focus
windowにフォーカスが当たった場合に自動的に再検証が走り、最新のデータがフェッチされ、再レンダリングされます。
![](https://storage.googleapis.com/zenn-user-upload/8dfcf5603698-20231116.gif)

##### Revalidate on Interval
windowにフォーカスを当てずとも、ポーリング間隔を指定することで、一定の間隔で再検証を走らせてデータ更新を行うことができます。
異なるデバイス間で定期的にデータ更新を行う際に便利です。
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

#### リクエストの重複
SWRには重複排除の仕組みが備わっています。
この例では、各コンポーネントにデータ取得の責務を結びつけるために、内部でuseSWRを用いたカスタムhooksをコンポーネント内で呼び出していました。

これにより、ユーザ情報を必要とするPersonコンポーネントとHeaderコンポーネントそれぞれで`useGetUser` hookをコールすることになるのですが、ネットワークトランザクションが2回起こることにならないのでしょうか？

useSWRでは同じキーを持ち、ほぼ同時期にレンダリングされるコンポーネントに関しては、リクエストは一つにまとめられます。
![swrリクエストの重複](https://storage.googleapis.com/zenn-user-upload/8d261ba9c7db-20231116.png)

この重複排除の仕組みのおかげで、ネットワークトランザクション回数によるパフォーマンスの問題を気にせずにアプリ内でバシバシSWRフックを再利用することができます💪🏻

### TanStack Query
TanStack Queryを用いてデータのフェッチ・更新を行うときの挙動も確認していきます。

#### 実験
TanStack Queryも内部的にContextを使用しているため、TanStack Queryを使用するコンポーネントをまるっとQueryClientProviderでラップしなければなりません。そのため、ここでもトップ階層に'use client'ディレクティブを置いておきます。
QueryClientProviderはnewしたQueryClientインスタンスと接続し、インスタンスを内部のコンポーネントに提供して使用できるようにします。
```page.tsx
export default function TanstackPage() {
	const queryClient = new QueryClient();
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
*↑/src/app/prc-tanstack/page.tsx*

TanStack QueryでもSWRと同様、カスタムhooksを用いてデータ取得を各々のコンポーネントで行うため、propsのバケツリレーを防ぐことができていますね。

Personコンポーネントでユーザ名を更新してみます。TanStack Queryでは更新処理専用のhooks、useMutationが存在し、そのhooksが更新・更新時の状態を管理します。
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-tanstack/hooks/useMutateUser.ts

細かいかもしれませんが、上記よりTanStack Queryではmutationという処理を行っているときの状態が管理できるので、mutateが使われたとき、つまり**データ更新処理が発火したときから**isPendingという状態を受け取ることができます。
そして、データ更新が正常に行われると、onSuccessでその状態を受け取り、`queryClient.invalidateQueries({ queryKey: ["/api/get/user"] });`にて`/api/get/user`をキーにもつリソースの再検証を発行します。
再検証を発行されたリソース（ここではTanStack Queryの`useGetUser`）はデータの再フェッチを行うわけですが、そのときの状態は`useGetUser`n内部で用いられているuseQueryからisFetchingとして受け取ることができます。
まとめると、TanStack QueryでuseMutationを用いたときのデータ更新処理は
1. mutateでデータ更新をトリガーする
2. データ更新がトリガーされたらisPendingを返す（Updating...表示）
3. データ更新が完了したらonSuccessが状態を受け取り、キーを持つリソースの再検証を発行する(`useGetUser`にデータが古いことを伝えてリフェッチを促す)（Updating...非表示）
4. `useGetUser`が再検証を開始するとともにisFetchingを返す（⏳loading...表示）
5. `useGetUser`内のuseQueryのqueryFnの処理でデータの再フェッチを行う（⏳loading...表示）
6. queryFnの処理が完了する（⏳loading...非表示）
![](https://storage.googleapis.com/zenn-user-upload/9be6ad2bb790-20231116.gif)

SWRを用いたときのデータ更新処理は
1. fetch関数が呼び出されてデータ更新が行われる
2. データ更新が完了する
3. mutate(key)でキーを持つリソースの再検証を発行する(`useGetUser`にデータが古いことを伝えてリフェッチを促す)
4. `useGetUser`が再検証を開始するとともにisValidatingを返す（⏳loading...表示）
5. `useGetUser`内のuseSWRの第二引数の処理でデータの再フェッチを行う（⏳loading...表示）
6. 5の処理が完了する（⏳loading...非表示）
![](https://storage.googleapis.com/zenn-user-upload/77d80b781381-20231116.gif)

となり、DB update処理中（API内部処理実行中）の状態を、TanStack Queryはwatchできるのに対し、SWRではその機能は提供されていないということになります。

#### 挙動
上記の動画より、TanStack QueryもSWRの時ように`useGetUser`を使用しているコンポーネントでのみ再レンダリングが発火していることがわかります。TanStack Queryもキーによってデータの取得・更新処理を行うか否かを管理しているからです。

TanStack Queryにもデータを最新に保つ仕組みが備わっています。Window Focus RefetchingについてSWRと比較して見てみましょう。

##### Window Focus Refetching
v4まではwindowにフォーカスが当たった場合に自動的に再検証が走り、最新のデータに書きかわる、SWR同等の仕様でした。
しかし、こちらの[PR](https://github.com/TanStack/query/pull/4805)によりfocusイベントで再検証が走ることのデメリットが議論された結果、v5からはfocusイベントではなくvisibilitychangeによって自動的再検証が走るような仕様になっているようです。

現状focusで再検証が走るSWR
![](https://storage.googleapis.com/zenn-user-upload/bf7fe92de8a0-20231116.gif)

visibilitychangeで再検証が走るTanStack Query
![](https://storage.googleapis.com/zenn-user-upload/62696d85c3ed-20231116.gif)

focusで再検証が走ることはSWRでも議論されており、[PR](https://github.com/vercel/swr/pull/2672)も出ているので、将来的にはmergeされてTanStack Queryの仕様に近づくのだと思います。🏗️

#### リクエストの重複
こちらもSWR同様リクエストをキーで管理しているので、重複が排除されます。
![tanstackリクエストの重複](https://storage.googleapis.com/zenn-user-upload/169e1a2cb75b-20231116.png)

## App Router cache
最後に、Next.js App Routerのキャッシュ機構を用いたデータフェッチと再検証を見ていきます。

### 実験
RSC(React Server Component)を使用します。formを含む葉のPersonコンポーネント(Client Component)以外をRSCとして、それぞれコンポーネント内でfetch関数を直接呼び出してデータの取得を行います。
（e.g.; header.tsx）
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/children/header.tsx

loadingに関しては、React18からstableで提供され始めたSuspenseを用いることでコンポーネントのPromiseをキャッチしてfallbackの内容を返すことができます。加えて、Next.js v13以降でページレベルでloadingを制御したい場合はloading.jsx/tsxをpage.jsx/tsxと同階層に置くことで対応できます。
(※上記のRSCではSuspenseの動作を確認するために、意図的にsleep関数を仕込んでいました)
https://github.com/saku-1101/caching-swing/blob/6bba6e5f662018c0cc3bdb68fb58c09e9b3de3f5/src/app/prc-fetch/page.tsx#L8-L24

また、error boundayに関しては、ReactからはSuspenseのようにfunction componentとして提供されているものはないようです。
コンポーネントごとにエラーの出し分けをしたい場合は、[公式](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)にもあるように、現状[react-error-boundary](https://github.com/bvaughn/react-error-boundary)を使うとよさそうです。もしNext.js v13以降でページレベルでerrorを制御したい場合は、**Client Componentとして**error.jsx/tsxをloadingと同様page.jsx/tsxと同階層に置くことで対応できます。
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/error.tsx

それでは、Personコンポーネント内のformを用いてユーザ名を更新してみましょう。
ここではServer Actionsを用いて更新処理を行います。(実験環境: next.js v14.0.2)
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/actions/handleUpdateUserName.ts
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/children/user.tsx

Server Actionsの細かな説明は割愛しますが、`/app/api`内部でしていた処理と同等の処理を行っています。Server ActionsからORMを介して直接DBを更新する処理です。

ここで注目したいのが`revalidateTag("user");`の部分です。
https://github.com/saku-1101/caching-swing/blob/6bba6e5f662018c0cc3bdb68fb58c09e9b3de3f5/src/app/prc-fetch/actions/handleUpdateUserName.ts#L14
https://github.com/saku-1101/caching-swing/blob/6bba6e5f662018c0cc3bdb68fb58c09e9b3de3f5/src/app/prc-fetch/children/form-output.tsx#L6-L9
fetchの際のoptionとして`{ next: { tags: [tag] } }`が渡されたものに関しては、これがデータの再検証の際のキャッシュのタグとして紐付けられます。
Server Actionsでデータ更新後に`revalidateTag(tag);`を行うとNext.js組み込みのData Cacheストレージからそのタグに紐づけられたキャッシュが再検証されて最新のデータに置き換わります。

### 挙動
RSCのfetchを用いた時のデータ取得・更新の挙動です。
![](https://storage.googleapis.com/zenn-user-upload/222f91481c64-20231116.gif)

### リクエストの重複
#### Network Memorization
Reactには[Network Memorization](https://nextjs.org/docs/app/building-your-application/caching#request-memoization)という機能が備わっており、fetchを用いたリクエストをメモ化し、キャッシュサーバへのリクエストの重複を排除してくれます。SWRやTanStack Queryで内部的に用いたれていたContext Providerの仕組みがキャッシュによって実現されているイメージです。

しかし、リクエスト結果のキャッシュがインメモリのData Cacheストレージに残っており、それを再利用する場合は、ネットワークトランザクションさえ起こりません。
![rscリクエストの重複](https://storage.googleapis.com/zenn-user-upload/59b68b7a218b-20231116.png)

## まとめ
自分の中で挙動や理解がまとまっていなかった、Reactにおけるさまざまなデータフェッチ・管理方法を浅く広くまとめることができて良い機会だったと思います。
また、Reactの状態管理といえばRedux, zustand, Jotai...などが有名でよく使っていたのですが、RSCの登場によって、こうしたuseContextを内包するようなライブラリに使いにくさを感じ始めました。
SWR, TanStack Queryは「キャッシュの仕組みを利用して状態管理ができる」ということもよく言われていましたが、内部的な組み込みキャッシュの構造をよくみるとContextを使用しているのでRSCでの解決策にはなりにくそうです。
とはいえ、それぞれのデータフェッチ方法の個性を活かしつつ、敵最適所で使わせてもらおうと思います。
OSSありがとう！🙌🏻

## 余談 - (TanStack Query)broadcastQueryClientという実験的な機能
TanStack Queryがwindowにフォーカスが当たった時ではなくvisibilitychangeによってデータの再検証を行う方向になったお話を先ほどしました。
以前TanStack Queryを使用した時は、windowフォーカスで再検証が行われていたため、今回の調査の時にwindowを二つ開いて一つのwindowでデータを更新した時、もう一つのwindowに戻ってデータが更新されないことに（？）となり、Q&Aを投げてみました。

https://github.com/TanStack/query/discussions/6364

結果、私の確認不足ということで、v5から上記の挙動に変わっていたのですが、今は`broadcastQueryClient`でアプリレベルでconnectionを張って変更を検知できるようにしている機能を開発してるよという回答をいただき、それも試してみました。詳細な仕組みは理解できていません。(実はこれもexperimentalとしてlatestのdocumentには明記されている)
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
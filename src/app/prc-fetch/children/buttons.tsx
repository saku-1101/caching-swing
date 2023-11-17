"use client";
import BackButton from "../../_component/back-button";
import LinkButton from "../../_component/link-button";
export default function Buttons() {
  return (
    <>
      <BackButton />
      <LinkButton link="/prc-tanstack" label="tanstack" />
      <LinkButton link="/prc-swr" label="swr" />
      <LinkButton link="/legacy-fetch" label="legacy" />
    </>
  );
}

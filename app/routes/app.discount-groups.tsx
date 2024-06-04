import { Box, Card, Layout, Page, EmptyState } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Outlet } from "@remix-run/react";

export default function DiscountgroupsMainPage() {
  function handleCreateNewDiscountgroup() {
    console.log("new dioscount group");
  }

  return (
    <div>
      <Outlet />
    </div>
  );
}

import { HomeContentClient, type HomeContentClientProps } from "@/components/client/HomeContentClient";

export type HomeContentProps = HomeContentClientProps;

export function HomeContent(props: HomeContentProps) {
  return <HomeContentClient {...props} />;
}

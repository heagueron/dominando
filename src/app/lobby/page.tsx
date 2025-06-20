import { getRandomEntryMessage } from '@/actions/entryMessageActions';
import LobbyPageClient from '@/components/lobby/LobbyPageClient';

export default async function LobbyPage() {
  // 1. Fetch data on the server. This is a Server Component.
  const randomMessage = await getRandomEntryMessage();

  // 2. Render the Client Component and pass the data as props.
  return <LobbyPageClient randomMessage={randomMessage} />;
}

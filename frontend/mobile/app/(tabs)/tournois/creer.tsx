import { Plus } from 'lucide-react-native';

import { StubScreen } from '@/components/StubScreen';

export default function CreateTournamentScreen() {
  return (
    <StubScreen
      title="Créer un tournoi"
      hint="Wizard 3 étapes disponible en Phase 6.2."
      icon={Plus}
    />
  );
}

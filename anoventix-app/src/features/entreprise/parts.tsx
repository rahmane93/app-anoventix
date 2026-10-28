import { colors } from '@/src/theme';
import type { AgentDTO } from '@/src/types/entreprise.types';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import AppText from '@/src/components/AppText';
import { styles } from './styles';

export function SectionLabel({ title }: { title: string }) {
  return <AppText style={styles.sectionLabel} accessibilityRole="header">{title}</AppText>;
}

export function InfoRow({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={colors.textMuted} style={styles.infoIcon} />
      <View style={{ flex: 1 }}>
        <AppText style={styles.infoLabel}>{label}</AppText>
        <AppText style={styles.infoValue}>{value}</AppText>
      </View>
    </View>
  );
}

export function AgentCard({
  agent,
  onToggleStatus,
  onRemove,
  isToggling,
  isRemoving,
  canToggle,
  canRemove,
  onResendInvitation,
}: {
  agent: AgentDTO;
  /** Seul le propriétaire peut renvoyer l'invitation d'un agent en attente. */
  onResendInvitation?: () => void;
  onToggleStatus: () => void;
  onRemove: () => void;
  isToggling: boolean;
  isRemoving: boolean;
  canToggle: boolean;
  canRemove: boolean;
}) {
  const initials = [agent.prenom, agent.nom]
    .filter(Boolean)
    .map((s) => s![0].toUpperCase())
    .join('') || (agent.email?.[0]?.toUpperCase() ?? '?');

  const statutColor =
    agent.statut === 'ACTIF' ? colors.successText :
    agent.statut === 'SUSPENDU' || agent.statut === 'INACTIF' ? colors.errorText :
    colors.textMuted;
  const statutLabel =
    agent.statut === 'ACTIF' ? 'Actif' :
    agent.statut === 'SUSPENDU' ? 'Suspendu' :
    agent.statut === 'INACTIF' ? 'Désactivé' :
    agent.statut === 'EN_ATTENTE_ACTIVATION' ? 'En attente d\'activation' :
    (agent.statut ?? '—');
  // Un agent en attente (invitation pas encore acceptée) est suspendable ;
  // « Activer » ne sert qu'à lever une suspension posée par l'entreprise.
  const isActive = agent.statut === 'ACTIF' || agent.statut === 'EN_ATTENTE_ACTIVATION';
  const toggleLabel = isActive ? 'Suspendre' : 'Activer';
  const toggleIcon = isActive ? 'pause-circle-outline' : 'play-circle-outline';
  const toggleColor = isActive ? colors.warningText : colors.successText;

  return (
    <View style={styles.agentCard}>
      <View style={styles.agentAvatar}>
        <AppText style={styles.agentInitials}>{initials}</AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={styles.agentName}>
          {[agent.prenom, agent.nom].filter(Boolean).join(' ') || agent.email}
        </AppText>
        <AppText style={styles.agentEmail}>{agent.email}</AppText>
        {agent.telephone ? (
          <AppText style={styles.agentPhone}>{agent.telephone}</AppText>
        ) : null}
        <View style={styles.agentStatutRow}>
          <View style={[styles.agentStatutDot, { backgroundColor: statutColor }]} />
          <AppText style={[styles.agentStatut, { color: statutColor }]}>{statutLabel}</AppText>
        </View>
        {agent.statut === 'EN_ATTENTE_ACTIVATION' && onResendInvitation ? (
          <TouchableOpacity
            onPress={onResendInvitation}
            accessibilityRole="button"
            accessibilityLabel={`Renvoyer l'invitation à ${agent.email}`}
            style={styles.agentResendLink}
          >
            <AppText style={styles.agentResendText}>Renvoyer l'invitation</AppText>
          </TouchableOpacity>
        ) : null}
      </View>
      {(canToggle || canRemove) ? (
        <View style={styles.agentActions}>
          {canToggle ? (
            <TouchableOpacity
              onPress={onToggleStatus}
              disabled={isToggling || isRemoving}
              style={[
                styles.agentActionBtn,
                styles.agentToggleBtn,
                { borderColor: toggleColor, backgroundColor: `${toggleColor}14` },
              ]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${toggleLabel} l'agent`}
              accessibilityState={{ disabled: isToggling || isRemoving, busy: isToggling }}
            >
              {isToggling ? (
                <ActivityIndicator size="small" color={toggleColor} />
              ) : (
                <>
                  <Ionicons name={toggleIcon as any} size={16} color={toggleColor} />
                  <AppText style={[styles.agentActionText, { color: toggleColor }]}>{toggleLabel}</AppText>
                </>
              )}
            </TouchableOpacity>
          ) : null}
          {canRemove ? (
            <TouchableOpacity
              onPress={onRemove}
              disabled={isRemoving || isToggling}
              style={[styles.agentActionBtn, styles.agentRemoveBtn]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Retirer l'agent"
              accessibilityState={{ disabled: isRemoving || isToggling, busy: isRemoving }}
            >
              {isRemoving ? (
                <ActivityIndicator size="small" color={colors.errorText} />
              ) : (
                <>
                  <Ionicons name="person-remove-outline" size={16} color={colors.errorText} />
                  <AppText style={[styles.agentActionText, { color: colors.errorText }]}>Retirer</AppText>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

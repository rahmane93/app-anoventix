package com.app.AnnoncesAPI.mappers;

import com.app.AnnoncesAPI.dto.EntrepriseDTO;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.payload.request.EntrepriseRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/**
 * Mapper MapStruct pour l'entité Entreprise
 */
@Mapper(componentModel = "spring")
public interface EntrepriseMapper {
    
    /**
     * Convertit une entité Entreprise en DTO, sans les quotas : ceux-ci dépendent de la
     * valeur globale et du nombre d'annonces actives. Passer par QuotaEntrepriseService.toDTO.
     */
    @Mapping(target = "annonceurProfessionnelId", source = "annonceurProfessionnel.id")
    @Mapping(target = "annonceurProfessionnelEmail", source = "annonceurProfessionnel.email")
    @Mapping(target = "quotaAnnonces", ignore = true)
    @Mapping(target = "quotaAgents", ignore = true)
    @Mapping(target = "quotaAnnoncesPersonnalise", ignore = true)
    @Mapping(target = "quotaAgentsPersonnalise", ignore = true)
    @Mapping(target = "nombreAgents", ignore = true)
    @Mapping(target = "annoncesRestantes", ignore = true)
    @Mapping(target = "agentsRestants", ignore = true)
    EntrepriseDTO toDTO(Entreprise entreprise);
    
    /**
     * Convertit une EntrepriseRequest en entité Entreprise
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "annonceurProfessionnel", ignore = true)
    @Mapping(target = "agents", ignore = true)
    @Mapping(target = "quotaAnnonces", ignore = true) // null = valeur globale
    @Mapping(target = "quotaAgents", ignore = true)
    @Mapping(target = "active", constant = "true")
    @Mapping(target = "dateCreation", expression = "java(java.time.LocalDateTime.now())")
    @Mapping(target = "dateModification", ignore = true)
    @Mapping(target = "photoProfil", ignore = true)
    Entreprise toEntity(EntrepriseRequest request);
    
    /**
     * Met à jour une entité Entreprise à partir d'une EntrepriseRequest
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "annonceurProfessionnel", ignore = true)
    @Mapping(target = "agents", ignore = true)
    @Mapping(target = "quotaAnnonces", ignore = true)
    @Mapping(target = "quotaAgents", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "dateCreation", ignore = true)
    @Mapping(target = "dateModification", expression = "java(java.time.LocalDateTime.now())")
    @Mapping(target = "photoProfil", ignore = true)
    void updateEntityFromRequest(EntrepriseRequest request, @MappingTarget Entreprise entreprise);
}

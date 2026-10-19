package com.app.AnnoncesAPI.mappers;

import org.mapstruct.InheritConfiguration;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

import com.app.AnnoncesAPI.dto.AdminAnnonceDTO;
import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.BienImmoDTO;
import com.app.AnnoncesAPI.dto.LocalisationDTO;
import com.app.AnnoncesAPI.dto.MediaDTO;
import com.app.AnnoncesAPI.entities.Annonce;
import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Localisation;
import com.app.AnnoncesAPI.entities.Media;
import com.app.AnnoncesAPI.entities.Role;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.payload.request.BienImmoRequest;

@Mapper(componentModel = "spring")
public interface AnnonceMapper {

    // Convertir une entité Annonce (générique) en DTO de base
    @Mapping(source = "owner.id", target = "userId")
    @Mapping(source = "owner.nom", target = "annonceur.nom")
    @Mapping(source = "owner.prenom", target = "annonceur.prenom")
    @Mapping(source = "owner.telephone", target = "annonceur.telephone")
    @Mapping(source = "owner.photoProfil", target = "annonceur.photoProfil")
    @Mapping(source = "owner.role", target = "annonceur.role", qualifiedByName = "extractMainRole")
    @Mapping(source = "owner.entreprise.id", target = "annonceur.entrepriseId")
    @Mapping(source = "owner.entreprise.statutVerification", target = "annonceur.agenceVerifiee", qualifiedByName = "estVerifiee")
    @Mapping(source = "owner.annoncesMasquees", target = "proprietaireMasque")
    @Mapping(target = "slug", expression = "java(com.app.AnnoncesAPI.Utilities.Utility.slugify(annonce.getTitre()))")
    AnnonceDTO toDTO(Annonce annonce);

    // Convertir une entité BienImmo en DTO enrichi
    @Mapping(source = "owner.id", target = "userId")
    @Mapping(source = "owner.nom", target = "annonceur.nom")
    @Mapping(source = "owner.prenom", target = "annonceur.prenom")
    @Mapping(source = "owner.telephone", target = "annonceur.telephone")
    @Mapping(source = "owner.photoProfil", target = "annonceur.photoProfil")
    @Mapping(source = "owner.role", target = "annonceur.role", qualifiedByName = "extractMainRole")
    @Mapping(source = "owner.entreprise.id", target = "annonceur.entrepriseId")
    @Mapping(source = "owner.entreprise.statutVerification", target = "annonceur.agenceVerifiee", qualifiedByName = "estVerifiee")
    @Mapping(source = "owner.annoncesMasquees", target = "proprietaireMasque")
    @Mapping(target = "slug", expression = "java(com.app.AnnoncesAPI.Utilities.Utility.slugify(bienImmo.getTitre()))")
    BienImmoDTO bienImmoEntityToDTO(BienImmo bienImmo);

    // Vue de la modération : DTO public + identité du propriétaire (ECART-18)
    @InheritConfiguration(name = "bienImmoEntityToDTO")
    @Mapping(source = "owner.id", target = "proprietaireId")
    @Mapping(source = "owner.email", target = "proprietaireEmail")
    @Mapping(target = "proprietaireNom", expression = "java(nomComplet(bienImmo.getOwner()))")
    AdminAnnonceDTO toAdminDTO(BienImmo bienImmo);

    default String nomComplet(com.app.AnnoncesAPI.entities.User owner) {
        if (owner == null) {
            return null;
        }
        String nom = ((owner.getPrenom() == null ? "" : owner.getPrenom()) + " "
                + (owner.getNom() == null ? "" : owner.getNom())).trim();
        return nom.isEmpty() ? null : nom;
    }

    // Convertir une entité Localisation en DTO
    LocalisationDTO localisationToDTO(Localisation localisation);

    // Convertir un MediaDTO en Media
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "annonce", ignore = true)
    Media mediaToEntity(MediaDTO mediaDTO);
    MediaDTO mediaToDTO(Media media);

    // Convertir une BienImmoRequest en entité BienImmo (création)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "localisation", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "medias", ignore = true)
    @Mapping(target = "dateCreation", ignore = true)
    @Mapping(target = "dateModification", ignore = true)
    @Mapping(target = "actif", constant = "true")
    @Mapping(target = "motifCloture", ignore = true)
    @Mapping(target = "dateCloture", ignore = true)
    @Mapping(target = "nbFavoris", ignore = true)
    @Mapping(target = "referenceAnnonce", ignore = true)
    @Mapping(target = "statutModeration", ignore = true)
    @Mapping(target = "motifModeration", ignore = true)
    @Mapping(target = "dateMasquage", ignore = true)
    @Mapping(target = "masquageAutomatique", ignore = true)
    @Mapping(target = "reexamenDemande", ignore = true)
    @Mapping(target = "dateReexamen", ignore = true)
    @Mapping(target = "messageReexamen", ignore = true)
    @Mapping(target = "nbReexamens", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "vueCount", ignore = true)
    @Mapping(target = "dateExpiration", ignore = true)
    @Mapping(target = "relanceExpirationEnvoyee", ignore = true)
    @Mapping(target = "publicId", ignore = true)
    BienImmo bienImmoRequestToEntity(BienImmoRequest request);

    // Mettre à jour une entité BienImmo à partir d'une requête (update)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "localisation", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "medias", ignore = true)
    @Mapping(target = "dateCreation", ignore = true)
    @Mapping(target = "dateModification", ignore = true)
    @Mapping(target = "actif", ignore = true)
    @Mapping(target = "motifCloture", ignore = true)
    @Mapping(target = "dateCloture", ignore = true)
    @Mapping(target = "nbFavoris", ignore = true)
    @Mapping(target = "referenceAnnonce", ignore = true)
    @Mapping(target = "statutModeration", ignore = true)
    @Mapping(target = "motifModeration", ignore = true)
    @Mapping(target = "dateMasquage", ignore = true)
    @Mapping(target = "masquageAutomatique", ignore = true)
    @Mapping(target = "reexamenDemande", ignore = true)
    @Mapping(target = "dateReexamen", ignore = true)
    @Mapping(target = "messageReexamen", ignore = true)
    @Mapping(target = "nbReexamens", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "vueCount", ignore = true)
    @Mapping(target = "dateExpiration", ignore = true)
    @Mapping(target = "relanceExpirationEnvoyee", ignore = true)
    @Mapping(target = "publicId", ignore = true)
    void updateBienImmoFromRequest(BienImmoRequest request, @MappingTarget BienImmo bienImmo);

    /** Badge « Agence vérifiée » : l'annonceur appartient à une entreprise VERIFIEE (DEC-04). */
    @Named("estVerifiee")
    default boolean estVerifiee(com.app.AnnoncesAPI.enums.StatutVerificationEntreprise statut) {
        return statut == com.app.AnnoncesAPI.enums.StatutVerificationEntreprise.VERIFIEE;
    }

    @Named("extractMainRole")
    default TypeRole extractMainRole(Role role) {
        if (role == null) return null;
        return role.getName();
    }
}

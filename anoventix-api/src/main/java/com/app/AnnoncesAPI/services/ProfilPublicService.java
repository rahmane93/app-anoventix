package com.app.AnnoncesAPI.services;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.dto.AnnonceDTO;
import com.app.AnnoncesAPI.dto.ProfilPublicDTO;
import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutPieceIdentite;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.mappers.AnnonceMapper;
import com.app.AnnoncesAPI.payload.response.PageResponse;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.BienImmoSpecification;
import com.app.AnnoncesAPI.repositories.UserRepository;

/**
 * Profil public minimal d'un compte (DEC-21, RG-02-38, RG-02-39). Remplace l'appel de l'écran à l'endpoint
 * réservé à la modération : ni téléphone, ni email, ni statut ne sortent d'ici.
 */
@Service
public class ProfilPublicService {

    private static final int TAILLE_PAGE_MAX = 50;

    private final UserRepository utilisateurs;
    private final BienImmoRepository annonces;
    private final AnnonceMapper mapper;

    public ProfilPublicService(UserRepository utilisateurs, BienImmoRepository annonces, AnnonceMapper mapper) {
        this.utilisateurs = utilisateurs;
        this.annonces = annonces;
        this.mapper = mapper;
    }

    /** 404 pour un compte inconnu, suspendu, désactivé, anonymisé ou du staff : on ne révèle pas lequel. */
    @Transactional(readOnly = true)
    public ProfilPublicDTO profil(UUID id, int page, int taille) {
        User u = utilisateurs.findById(id).filter(ProfilPublicService::estPublic)
                .orElseThrow(() -> new ResourceNotFoundException("Profil introuvable."));
        Specification<BienImmo> visibles = BienImmoSpecification.visiblePublic()
                .and((root, query, cb) -> cb.equal(root.get("owner").get("id"), u.getId()));
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(taille, 1), TAILLE_PAGE_MAX),
                Sort.by(Sort.Direction.DESC, "dateCreation"));
        String nom = u.getNom() == null ? "" : u.getNom().trim();
        String initiale = nom.isEmpty() ? null : nom.substring(0, 1).toUpperCase() + ".";
        // Chaque annonce répète son annonceur : le nom complet n'a pas à sortir de ce profil (RG-02-38).
        PageResponse<AnnonceDTO> liste = PageResponse.of(annonces.findAll(visibles, pageable).map(b -> {
            AnnonceDTO dto = mapper.bienImmoEntityToDTO(b);
            if (dto.getAnnonceur() != null) {
                dto.getAnnonceur().setNom(initiale);
            }
            return dto;
        }));
        return new ProfilPublicDTO(
                u.getPrenom(),
                initiale,
                u.getPhotoProfil(),
                u.getCreatedAt() == null ? null : LocalDate.from(u.getCreatedAt()).withDayOfMonth(1),
                u.getStatutPieceIdentite() == StatutPieceIdentite.VALIDEE,
                u.getEntreprise() == null ? null : u.getEntreprise().getId(),
                liste);
    }

    private static boolean estPublic(User u) {
        return u.getStatut() == StatutUtilisateur.ACTIF
                && !u.isAdministrateur() && !u.isModerateur()
                && (u.getEmail() == null || !u.getEmail().endsWith("@anonyme.invalid"));
    }
}

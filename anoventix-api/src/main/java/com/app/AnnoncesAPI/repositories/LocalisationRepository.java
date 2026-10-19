package com.app.AnnoncesAPI.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.app.AnnoncesAPI.entities.Localisation;

@Repository
public interface LocalisationRepository extends JpaRepository<Localisation, String> {

    /** Régions du référentiel, dans l'ordre alphabétique l'app ne les écrit plus en dur). */
    @org.springframework.data.jpa.repository.Query(
            "SELECT DISTINCT l.region FROM localisation l WHERE l.technique = false AND l.region IS NOT NULL ORDER BY l.region")
    java.util.List<String> findRegions();

    // Les entrées techniques « Autre quartier » sont exclues des listes publiques et de l'administration.
    Page<Localisation> findByTechniqueFalse(Pageable pageable);

    Page<Localisation> findByCommuneAndTechniqueFalse(String communeName, Pageable pageable);

    Page<Localisation> findByPrefectureAndTechniqueFalse(String prefectureName, Pageable pageable);

    Page<Localisation> findByRegionAndTechniqueFalse(String regionName, Pageable pageable);

    java.util.Optional<Localisation> findFirstByRegionAndPrefectureAndCommuneAndTechniqueTrue(
            String region, String prefecture, String commune);

    java.util.Optional<Localisation> findFirstByRegionAndPrefectureAndCommuneAndTechniqueFalse(
            String region, String prefecture, String commune);

    java.util.List<Localisation> findByRegionAndPrefectureAndCommuneAndTechniqueFalse(
            String region, String prefecture, String commune);

    /** Quartier de même nom dans la même commune, aux accents, à la casse et à la ponctuation près. */
    default java.util.Optional<Localisation> trouverQuartier(String region, String prefecture, String commune,
                                                             String quartier) {
        String cible = normaliser(quartier);
        return findAll().stream()
                .filter(l -> !l.isTechnique())
                .filter(l -> normaliser(l.getRegion()).equals(normaliser(region))
                        && normaliser(l.getPrefecture()).equals(normaliser(prefecture))
                        && normaliser(l.getCommune()).equals(normaliser(commune))
                        && normaliser(l.getQuartier()).equals(cible))
                .findFirst();
    }

    static String normaliser(String s) {
        return java.text.Normalizer.normalize(s == null ? "" : s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(java.util.Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}

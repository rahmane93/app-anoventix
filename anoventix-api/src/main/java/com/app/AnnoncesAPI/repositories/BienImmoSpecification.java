package com.app.AnnoncesAPI.repositories;

import java.math.BigDecimal;

import org.springframework.data.jpa.domain.Specification;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.enums.TypeUsage;

public class BienImmoSpecification {

    private BienImmoSpecification() {}

    /** Visible du public (règle de la SFG §8, calculée par la base : migration V15). */
    public static Specification<BienImmo> visiblePublic() {
        return (root, query, cb) -> cb.isTrue(root.get("visiblePublic"));
    }

    /** Annonces devenues visibles après cette date (création ou remise en ligne) : alertes de recherche. */
    public static Specification<BienImmo> visibleDepuisApres(java.time.LocalDateTime date) {
        return (root, query, cb) -> cb.greaterThan(root.get("visibleDepuis"), date);
    }

    public static Specification<BienImmo> hasReference(String reference) {
        return (root, query, cb) ->
            reference == null ? null :
            cb.equal(cb.lower(root.get("referenceAnnonce")), reference.toLowerCase());
    }

    public static Specification<BienImmo> hasTypeAnnonce(TypeAnnonce typeAnnonce) {
        return (root, query, cb) ->
            typeAnnonce == null ? null :
            cb.equal(root.get("typeAnnonce"), typeAnnonce);
    }

    public static Specification<BienImmo> hasTypeBien(TypeBien typeBien) {
        return (root, query, cb) ->
            typeBien == null ? null :
            cb.equal(root.get("typeBien"), typeBien);
    }

    public static Specification<BienImmo> hasTypeUsage(TypeUsage typeUsage) {
        return (root, query, cb) ->
            typeUsage == null ? null :
            cb.equal(root.get("typeUsage"), typeUsage);
    }

    public static Specification<BienImmo> prixBetween(BigDecimal prixMin, BigDecimal prixMax) {
        return (root, query, cb) -> {
            if (prixMin != null && prixMax != null)
                return cb.between(root.get("prix"), prixMin, prixMax);
            if (prixMin != null)
                return cb.greaterThanOrEqualTo(root.get("prix"), prixMin);
            if (prixMax != null)
                return cb.lessThanOrEqualTo(root.get("prix"), prixMax);
            return null;
        };
    }

    public static Specification<BienImmo> hasRegion(String region) {
        return (root, query, cb) ->
            region == null ? null :
            cb.equal(cb.lower(root.get("localisation").get("region")), region.toLowerCase());
    }

    public static Specification<BienImmo> hasPrefecture(String prefecture) {
        return (root, query, cb) ->
            prefecture == null ? null :
            cb.equal(cb.lower(root.get("localisation").get("prefecture")), prefecture.toLowerCase());
    }

    public static Specification<BienImmo> hasCommune(String commune) {
        return (root, query, cb) ->
            commune == null ? null :
            cb.equal(cb.lower(root.get("localisation").get("commune")), commune.toLowerCase());
    }

    public static Specification<BienImmo> hasQuartier(String quartier) {
        return (root, query, cb) ->
            quartier == null ? null :
            cb.equal(cb.lower(root.get("localisation").get("quartier")), quartier.toLowerCase());
    }

    /** Restreint à une liste d'IDs (résultat d'une recherche plein texte). null = pas de restriction. */
    public static Specification<BienImmo> idIn(java.util.List<Long> ids) {
        return (root, query, cb) -> {
            if (ids == null) return null;
            if (ids.isEmpty()) return cb.disjunction();
            return root.get("id").in(ids);
        };
    }

    public static Specification<BienImmo> nbPiecesAuMoins(Integer min) {
        return (root, query, cb) ->
            min == null ? null : cb.greaterThanOrEqualTo(root.get("nbPieces"), min);
    }

    public static Specification<BienImmo> nbChambresAuMoins(Integer min) {
        return (root, query, cb) ->
            min == null ? null : cb.greaterThanOrEqualTo(root.get("nbChambres"), min);
    }

    public static Specification<BienImmo> surfaceBetween(Double min, Double max) {
        return (root, query, cb) -> {
            if (min != null && max != null) return cb.between(root.get("surfaceTotal"), min, max);
            if (min != null) return cb.greaterThanOrEqualTo(root.get("surfaceTotal"), min);
            if (max != null) return cb.lessThanOrEqualTo(root.get("surfaceTotal"), max);
            return null;
        };
    }

    /** Combine tous les filtres en une seule Specification. */
    public static Specification<BienImmo> buildFilter(
            String reference,
            TypeAnnonce typeAnnonce,
            TypeBien typeBien,
            TypeUsage typeUsage,
            BigDecimal prixMin,
            BigDecimal prixMax,
            String region,
            String prefecture,
            String commune,
            String quartier,
            java.util.List<Long> idsTexte,
            Integer nbPiecesMin,
            Integer nbChambresMin,
            Double surfaceMin,
            Double surfaceMax) {

        return Specification
            .where(visiblePublic())
            .and(hasReference(reference))
            .and(hasTypeAnnonce(typeAnnonce))
            .and(hasTypeBien(typeBien))
            .and(hasTypeUsage(typeUsage))
            .and(prixBetween(prixMin, prixMax))
            .and(hasRegion(region))
            .and(hasPrefecture(prefecture))
            .and(hasCommune(commune))
            .and(hasQuartier(quartier))
            .and(idIn(idsTexte))
            .and(nbPiecesAuMoins(nbPiecesMin))
            .and(nbChambresAuMoins(nbChambresMin))
            .and(surfaceBetween(surfaceMin, surfaceMax));
    }
}

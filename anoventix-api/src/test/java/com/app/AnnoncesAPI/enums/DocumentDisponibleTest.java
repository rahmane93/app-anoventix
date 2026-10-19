package com.app.AnnoncesAPI.enums;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** Documents disponibles en liste fermée (ECART-35). */
class DocumentDisponibleTest {

    @Test
    void codesEtLibellesSontRamenesAuxCodesDansLOrdreDeLaListe() {
        assertThat(DocumentDisponible.normaliser("Donation, titre foncier")).isEqualTo("TITRE_FONCIER,DONATION");
        assertThat(DocumentDisponible.normaliser("CERTIFICAT_USAGE_FONCIER,Certificat d'usage foncier"))
                .isEqualTo("CERTIFICAT_USAGE_FONCIER");
        assertThat(DocumentDisponible.normaliser("ACTE_DE_VENTE")).isEqualTo("ACTE_DE_VENTE");
    }

    @Test
    void uneValeurInconnueOuVideEstRefusee() {
        assertThatThrownBy(() -> DocumentDisponible.normaliser("Plan cadastral"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Plan cadastral");
        assertThatThrownBy(() -> DocumentDisponible.normaliser(" , "))
                .isInstanceOf(IllegalArgumentException.class);
    }
}

package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocalisationRequest {

    @NotBlank(message = "La région est obligatoire")
    @Size(max = 100)
    private String region;

    @NotBlank(message = "La préfecture est obligatoire")
    @Size(max = 100)
    private String prefecture;

    @NotBlank(message = "La commune est obligatoire")
    @Size(max = 100)
    private String commune;

    @NotBlank(message = "Le quartier est obligatoire")
    @Size(max = 100)
    private String quartier;

    @NotBlank(message = "Le type de commune est obligatoire")
    @Pattern(regexp = "urbaine|rurale", message = "Le type doit être 'urbaine' ou 'rurale'")
    private String typeCommune;

    /** Point de référence du quartier (facultatif, les deux ou aucun). */
    @jakarta.validation.constraints.DecimalMin(value = "-90") @jakarta.validation.constraints.DecimalMax(value = "90")
    private java.math.BigDecimal latitude;

    @jakarta.validation.constraints.DecimalMin(value = "-180") @jakarta.validation.constraints.DecimalMax(value = "180")
    private java.math.BigDecimal longitude;
}

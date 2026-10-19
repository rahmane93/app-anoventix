package com.app.AnnoncesAPI.payload.request;

import com.app.AnnoncesAPI.enums.TypeRole;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangementRoleRequest {

    @NotNull(message = "Le rôle est obligatoire")
    private TypeRole role;
}

package com.app.AnnoncesAPI.payload.request;

import jakarta.validation.constraints.NotBlank;

public class ChangePasswordRequest {
    @NotBlank(message = "L'ancien mot de passe est obligatoire.")
    private String oldPassword;

    @NotBlank(message = "Le nouveau mot de passe est obligatoire.")
    private String newPassword;

    public String getOldPassword() {
        return oldPassword;
    }
    public void setOldPassword(String oldPassword) {
        this.oldPassword = oldPassword;
    }
    public String getNewPassword() {
        return newPassword;
    }
    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}

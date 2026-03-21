package com.jade.move.dto;

public class KeycloakClientInfo {
    private String clientId;
    private String clientSecret;
    private String internalId;

    public KeycloakClientInfo() {}

    public KeycloakClientInfo(String clientId, String clientSecret, String internalId) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.internalId = internalId;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getInternalId() {
        return internalId;
    }

    public void setInternalId(String internalId) {
        this.internalId = internalId;
    }
}

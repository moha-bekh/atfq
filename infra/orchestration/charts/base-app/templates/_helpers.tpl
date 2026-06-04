{{- define "base-app.name" -}}
{{- default .Release.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "base-app.labels" -}}
app.kubernetes.io/name: {{ include "base-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end -}}

{{- define "base-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "base-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "base-app.container" -}}
name: {{ include "base-app.name" . }}
image: "{{ .Values.image.repository }}:{{ default "latest" .Values.image.tag }}"
imagePullPolicy: {{ default "IfNotPresent" .Values.image.pullPolicy }}
{{- with .Values.command }}
command:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.args }}
args:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.env }}
env:
{{- range $name, $value := . }}
  - name: {{ $name }}
    value: {{ $value | quote }}
{{- end }}
{{- end }}
{{- with .Values.envFrom }}
envFrom:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- if .Values.ports }}
ports:
{{- range .Values.ports }}
  - name: {{ .name }}
    containerPort: {{ .containerPort }}
    protocol: {{ default "TCP" .protocol }}
{{- end }}
{{- end }}
{{- with .Values.securityContext }}
securityContext:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.resources }}
resources:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.startupProbe }}
startupProbe:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.readinessProbe }}
readinessProbe:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.livenessProbe }}
livenessProbe:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.volumeMounts }}
volumeMounts:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- end -}}

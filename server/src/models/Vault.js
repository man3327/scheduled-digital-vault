import mongoose from 'mongoose';
const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  storageKey: { type: String, required: true }, // the random name on disk. NEVER sent to clients.
});
const vaultSchema  = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        releaseAt: {
            type: Date,
        },
        recipients: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        files: [fileSchema],
    },
    {timestamps: true}
);
vaultSchema.index({ ownerId: 1, createdAt: -1 });
vaultSchema.index({ recipients: 1, createdAt: -1 });
vaultSchema.index({ files: 1, createdAt: -1 });
vaultSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    ownerId: String(this.ownerId),
    title: this.title,
    releaseAt: this.releaseAt,
    createdAt: this.createdAt,
    recipientCount: this.recipients.length,
    files: this.files.map((f) => ({
      id: String(f._id),
      originalName: f.originalName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
    })),
  };
};
export const Vault = mongoose.model('Vault', vaultSchema);
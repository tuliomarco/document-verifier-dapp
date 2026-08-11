import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxDropzoneModule } from 'ngx-dropzone';

@Component({
  selector: 'app-dropzone',
  standalone: true,
  imports: [CommonModule, NgxDropzoneModule],
  templateUrl: './dropzone.html',
  styleUrls: ['./dropzone.css']
})
export class DropzoneComponent {
  @Input() selectedFile: File | null = null;
  @Input() isProcessing = false;
  @Output() fileAccepted = new EventEmitter<File>();

  onSelect(event: any) {
    if (this.isProcessing) return;

    if (event.addedFiles && event.addedFiles.length > 0) {
      this.fileAccepted.emit(event.addedFiles[0]);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
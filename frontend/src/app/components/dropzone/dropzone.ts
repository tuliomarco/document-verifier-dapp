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
  @Output() fileAccepted = new EventEmitter<File>();

  // Equivalente ao onDrop do useCallback
  onSelect(event: any) {
    if (event.addedFiles && event.addedFiles.length > 0) {
      // Emite o arquivo selecionado de volta para o MainCard
      this.fileAccepted.emit(event.addedFiles[0]);
    }
  }
}
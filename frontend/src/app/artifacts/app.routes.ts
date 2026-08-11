import { Routes } from '@angular/router';
import { HomeComponent } from '../components/home/home';
import { DocumentsComponent } from '../components/documents/documents';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'documents', component: DocumentsComponent },
  { path: '**', redirectTo: '' } 
];
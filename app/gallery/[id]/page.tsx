import GalleryView from '../../gallery-view';
import {getAppUser} from '../../account-auth';
export const dynamic='force-dynamic';
export const metadata={title:'Community visualizer — ATStudio'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params,user=await getAppUser();return <GalleryView id={id} initialUser={user?{name:user.name,email:user.email,kind:user.kind}:null}/>}

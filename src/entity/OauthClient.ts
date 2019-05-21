import { Entity, ObjectIdColumn, ObjectID, Column, BaseEntity } from "typeorm";
import { ObjectType, Field, ID } from "type-graphql";

@ObjectType()
@Entity("OauthClients")
export class OauthClient extends BaseEntity {
	@Field(() => ID)
	@ObjectIdColumn()
	id: ObjectID;

	@Field()
	@Column("text")
	clientId: string;

	@Field()
	@Column("text")
	clientSecret: string;

	@Column()
	salt: string;

	@Field()
	@Column()
	createdAt: Date;

	@Field()
	@Column()
	updatedAt: Date;

	@Field(() => [String], { nullable: true })
	@Column("text")
	scope: string[]; // read-only, read-write, admin
}
